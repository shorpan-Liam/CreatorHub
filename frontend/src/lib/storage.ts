import { openDB } from 'idb';
import {
  draftSchema,
  brandSchema,
  layoutSchema,
  type Draft,
} from '../tools/article-to-images/model';

export type PaddingPreset = {
  id: string;
  name: string;
  paddingX: number;
  paddingY: number;
  firstPagePaddingTop: number | null;
};
export async function getPaddingPresets(): Promise<PaddingPreset[]> {
  const value = await (await database).get('preferences', 'paddingPresets');
  if (!Array.isArray(value)) return [];
  return value.filter(
    (p) =>
      p &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      p.name.length <= 40 &&
      layoutSchema.shape.paddingX.safeParse(p.paddingX).success &&
      layoutSchema.shape.paddingY.safeParse(p.paddingY).success &&
      layoutSchema.shape.firstPagePaddingTop.safeParse(p.firstPagePaddingTop).success,
  );
}
export async function savePaddingPreset(preset: PaddingPreset) {
  const db = await database;
  const tx = db.transaction('preferences', 'readwrite');
  const rows: PaddingPreset[] = (await tx.store.get('paddingPresets')) || [];
  const next = rows.filter((p) => p.name !== preset.name);
  if (next.length >= 30) {
    tx.abort();
    throw new Error('最多收藏 30 套边距，请先删除不需要的版本。');
  }
  next.push(preset);
  await tx.store.put(next, 'paddingPresets');
  await tx.done;
}
export async function deletePaddingPreset(id: string) {
  const db = await database;
  const tx = db.transaction('preferences', 'readwrite');
  const rows: PaddingPreset[] = (await tx.store.get('paddingPresets')) || [];
  await tx.store.put(
    rows.filter((p) => p.id !== id),
    'paddingPresets',
  );
  await tx.done;
}

const database = openDB('creatorhub', 1, {
  upgrade(db) {
    db.createObjectStore('drafts', { keyPath: 'id' });
    db.createObjectStore('preferences');
  },
});

export async function listDrafts(): Promise<Draft[]> {
  const rows = await (await database).getAll('drafts');
  return rows
    .filter((x) => draftSchema.safeParse(x).success)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
export async function loadDraft(id: string): Promise<Draft | undefined> {
  const item = await (await database).get('drafts', id);
  return item ? draftSchema.parse(item) : undefined;
}
export async function saveDraft(draft: Draft, expectedToken: string): Promise<Draft> {
  const db = await database;
  const tx = db.transaction('drafts', 'readwrite');
  const previous = await tx.store.get(draft.id);
  if (previous && previous.writeToken !== expectedToken) {
    tx.abort();
    throw new Error('CONFLICT');
  }
  if (!previous && (await tx.store.count()) >= 20) {
    tx.abort();
    throw new Error('最多保留 20 份草稿，请先删除不需要的草稿。');
  }
  const saved = { ...draft, savedAt: new Date().toISOString(), writeToken: crypto.randomUUID() };
  await tx.store.put(saved);
  await tx.done;
  return saved;
}
export async function deleteDraft(id: string) {
  await (await database).delete('drafts', id);
}
export async function clearLocal() {
  const db = await database;
  await db.clear('drafts');
  await db.clear('preferences');
  Object.keys(localStorage)
    .filter((k) => k.startsWith('creatorhub:'))
    .forEach((k) => localStorage.removeItem(k));
}
export async function saveBrand(draft: Draft) {
  await (
    await database
  ).put('preferences', { brand: draft.brand, logoDataUrl: draft.logoDataUrl }, 'brand');
}
export async function getBrand() {
  const value = await (await database).get('preferences', 'brand');
  if (!value || !brandSchema.safeParse(value.brand).success) return null;
  return value as Pick<Draft, 'brand' | 'logoDataUrl'>;
}
export function readPreference<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`creatorhub:${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function writePreference(key: string, value: unknown) {
  try {
    localStorage.setItem(`creatorhub:${key}`, JSON.stringify(value));
  } catch {
    /* Editor reports draft storage errors separately. */
  }
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function exportDraft(draft: Draft) {
  const data = { ...draft, writeToken: '', savedAt: '' };
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${draft.title.replace(/[\\/:*?"<>|\n]/g, '').slice(0, 30) || '未命名'}.creatorhub.json`,
  );
}
export async function importDraft(file: File): Promise<Draft> {
  if (file.size > 10 * 1024 ** 2) throw new Error('备份文件不能超过 10 MiB。');
  let result;
  try {
    result = draftSchema.parse(JSON.parse(await file.text()));
  } catch {
    throw new Error('无法读取备份，请选择 CreatorHub 导出的 v1 项目文件。');
  }
  if (result.logoDataUrl) {
    const blob = await (await fetch(result.logoDataUrl)).blob();
    if (blob.size > 5 * 1024 ** 2) throw new Error('备份中的 Logo 超过 5 MiB。');
    try {
      const image = await createImageBitmap(blob);
      const oversized = image.width * image.height > 16000000;
      image.close();
      if (oversized) throw new Error('oversized');
    } catch {
      throw new Error('备份中的 Logo 已损坏或尺寸过大。');
    }
  }
  return { ...result, id: crypto.randomUUID(), revision: 0, writeToken: '', savedAt: '' };
}
