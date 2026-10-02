import { useEffect, useMemo, useRef, useState } from 'react';
import { api, APIError, connect } from '../../../client/request';
import type { RenderRequest } from '../../../client/types';
import {
  contentKey,
  draftSchema,
  parseSource,
  snapshotOf,
  type Job,
  type Snapshot,
} from '../model';
import { readPreference, saveBrand, writePreference } from '../../../lib/storage';
import { paginate, type Pagination } from '../rendering';
import { cancelRender, createRender, getRender } from '../service';
import { activeStatuses, useRenderJob } from './useRenderJob';
import { useDraftWorkspace } from './useDraftWorkspace';

async function digest(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function useArticleEditor() {
  const workspace = useDraftWorkspace();
  const { draft, update, setError, setMessage } = workspace;
  const [layoutState, setLayoutState] = useState<{
    snapshot: Snapshot;
    pagination: Pagination;
  } | null>(null);
  const [layoutError, setLayoutError] = useState('');
  const [layingOut, setLayingOut] = useState(false);
  const [page, setPage] = useState(0);
  const [mobileTab, setMobileTab] = useState('content');
  const [showSettings, setShowSettings] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [jobContentKey, setJobContentKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pendingRequest = useRef<{ key: string; signature: string; payload: RenderRequest } | null>(
    null,
  );
  const uploaded = useRef<{ data: string; id: string; at: number } | null>(null);

  const signature = draft ? contentKey(draft) : '';
  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    setLayingOut(true);
    setLayoutError('');
    const timer = setTimeout(async () => {
      try {
        draftSchema.parse(draft);
        const snapshot = snapshotOf(draft);
        const pagination = await paginate(snapshot);
        if (!cancelled) {
          setLayoutState({ snapshot, pagination });
          setLayoutError('');
          setPage((p) => Math.min(p, pagination.pages.length - 1));
        }
      } catch (e) {
        if (!cancelled) {
          setLayoutError(e instanceof Error ? e.message : '排版失败');
          setLayoutState(null);
        }
      } finally {
        if (!cancelled) setLayingOut(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature]);

  // Restore the last server task only for an identical local document.
  useEffect(() => {
    if (!draft) return;
    let alive = true;
    setJob(null);
    setJobContentKey('');
    setPage(0);
    const saved = readPreference<{ id: string; hash: string } | null>(`job:${draft.id}`, null);
    if (saved)
      digest(contentKey(draft)).then(async (hash) => {
        if (hash !== saved.hash) return;
        try {
          const result = await getRender(saved.id);
          if (alive) {
            setJob(result);
            setJobContentKey(contentKey(draft));
          }
        } catch {
          /* Expired session: the local draft remains usable. */
        }
      });
    return () => {
      alive = false;
    };
  }, [draft?.id]);

  const activeJob = !!job && activeStatuses.includes(job.status);
  const taskQuery = useRenderJob(job?.id, activeJob);
  const pollError = taskQuery.error?.message || '';
  useEffect(() => {
    if (taskQuery.data) setJob(taskQuery.data);
  }, [taskQuery.data]);
  useEffect(() => {
    const failure = taskQuery.error;
    if (failure instanceof APIError && [401, 404, 410].includes(failure.status)) {
      setJob((current) =>
        current
          ? {
              ...current,
              status: 'failed',
              error: { code: failure.code, message: '任务已失效，请重新生成。' },
            }
          : null,
      );
      pendingRequest.current = null;
      uploaded.current = null;
    }
  }, [taskQuery.error]);

  const currentResult = job?.status === 'succeeded' && !job.expired && jobContentKey === signature;
  const count = currentResult ? job.outputs.length : layoutState?.pagination.pages.length || 0;
  const index = Math.max(0, Math.min(page, count - 1));
  const parsed = useMemo(
    () => (draft ? parseSource(draft.source, draft.sourceFormat) : { blocks: [], warnings: [] }),
    [draft?.source, draft?.sourceFormat],
  );

  async function generate() {
    if (!draft) return;
    setError('');
    setSubmitting(true);
    const signature = contentKey(draft);
    try {
      draftSchema.parse(draft);
      const snapshot = snapshotOf(draft);
      await connect();
      if (!pendingRequest.current || pendingRequest.current.signature !== signature) {
        let assetId: string | null = null;
        if (draft.brand.showLogo && draft.logoDataUrl) {
          if (
            uploaded.current?.data === draft.logoDataUrl &&
            Date.now() - uploaded.current.at < 23 * 3600000
          )
            assetId = uploaded.current.id;
          else {
            const blob = await (await fetch(draft.logoDataUrl)).blob();
            const data = new FormData();
            data.append('file', blob, 'logo.png');
            const asset = await api<{ id: string }>('/assets', { method: 'POST', body: data });
            assetId = asset.id;
            uploaded.current = { data: draft.logoDataUrl, id: asset.id, at: Date.now() };
          }
        }
        const { logoDataUrl: _logo, ...payload } = snapshot;
        payload.brand.logoAssetId = assetId;
        pendingRequest.current = { key: crypto.randomUUID(), signature, payload };
      }
      const pending = pendingRequest.current;
      const result = await createRender(pending.payload, pending.key);
      pendingRequest.current = null;
      setJob(result);
      setJobContentKey(signature);
      setPage(0);
      setMobileTab('preview');
      writePreference(`job:${draft.id}`, { id: result.id, hash: await digest(signature) });
    } catch (e) {
      if (e instanceof APIError && [401, 404, 410].includes(e.status)) {
        pendingRequest.current = null;
        uploaded.current = null;
      }
      setError(e instanceof Error ? e.message : '生成失败，请重试。');
    } finally {
      setSubmitting(false);
    }
  }
  async function upload(file: File) {
    if (!draft) return;
    try {
      if (
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 ** 2
      )
        throw new Error('请选择 5 MiB 以内的 PNG、JPG 或 WebP。');
      const image = await createImageBitmap(file);
      if (image.width * image.height > 16000000) {
        image.close();
        throw new Error('Logo 不能超过 1600 万像素。');
      }
      image.close();
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      update({ ...draft, logoDataUrl: data, brand: { ...draft.brand, showLogo: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片无法读取。');
    }
  }
  async function cancel() {
    if (!job) return;
    try {
      setJob(await cancelRender(job.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '取消失败');
    }
  }

  async function setDefaultBrand() {
    if (!draft) return;
    try {
      await saveBrand(draft);
      setMessage('默认署名已保存');
    } catch {
      setError('默认署名保存失败。');
    }
  }

  return {
    ...workspace,
    layoutState,
    layoutError,
    layingOut,
    page,
    setPage,
    mobileTab,
    setMobileTab,
    showSettings,
    setShowSettings,
    job,
    jobContentKey,
    submitting,
    generate,
    upload,
    cancel,
    setDefaultBrand,
    pollError,
    activeJob,
    currentResult,
    count,
    index,
    parsed,
    signature,
  };
}

export type ArticleEditorState = ReturnType<typeof useArticleEditor>;
