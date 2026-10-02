import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { newDraft, type Draft } from '../model';
import {
  getBrand,
  listDrafts,
  loadDraft,
  readPreference,
  saveDraft,
  writePreference,
} from '../../../lib/storage';

export function useDraftWorkspace() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Draft | null>(null);
  const currentRef = useRef<Draft | null>(null);
  currentRef.current = draft;
  const savedTokens = useRef(new Map<string, string>());
  const saveChain = useRef(Promise.resolve());
  const [saveStatus, setSaveStatus] = useState('');
  const [conflict, setConflict] = useState(false);
  const conflictRef = useRef(false);
  conflictRef.current = conflict;
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const importer = useRef<HTMLInputElement>(null);
  const past = useRef<Draft[]>([]),
    future = useRef<Draft[]>([]);

  function flushCurrent() {
    const item = currentRef.current;
    if (!item || conflictRef.current) return saveChain.current;
    const operation = saveChain.current.then(async () => {
      const saved = await saveDraft(item, savedTokens.current.get(item.id) || '');
      savedTokens.current.set(item.id, saved.writeToken);
    });
    saveChain.current = operation.catch(() => {});
    return operation;
  }

  // SPA navigation does not fire beforeunload. Persist the latest edit on unmount.
  useEffect(
    () => () => {
      flushCurrent().catch(() => {});
    },
    [],
  );

  function adopt(item: Draft) {
    savedTokens.current.set(item.id, item.writeToken);
    setDraft(item);
    setConflict(false);
    setError('');
    past.current = [];
    future.current = [];
    writePreference('last', item.id);
  }
  useEffect(() => {
    let alive = true;
    const recent = readPreference<string[]>('recent', []);
    writePreference(
      'recent',
      ['article-to-images', ...recent.filter((x) => x !== 'article-to-images')].slice(0, 12),
    );
    (async () => {
      try {
        const id = params.get('draft') || readPreference<string>('last', '');
        const stored = id ? await loadDraft(id) : null;
        const item = stored || newDraft();
        if (!stored) {
          const brand = await getBrand();
          if (brand) Object.assign(item, brand);
        }
        if (alive) adopt(item);
      } catch {
        if (alive) {
          adopt(newDraft());
          setError('无法读取本机草稿，请及时下载项目备份。');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function update(next: Draft) {
    if (!draft) return;
    past.current = [...past.current.slice(-99), draft];
    future.current = [];
    setDraft({ ...next, revision: draft.revision + 1 });
    setMessage('');
  }
  function undo(redo = false) {
    if (!draft) return;
    const from = redo ? future : past,
      to = redo ? past : future;
    const value = from.current.pop();
    if (value) {
      to.current.push(draft);
      setDraft({ ...value, revision: draft.revision + 1 });
    }
  }
  useEffect(() => {
    if (!draft || conflict) return;
    setSaveStatus('保存中…');
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current.then(async () => {
        try {
          const saved = await saveDraft(draft, savedTokens.current.get(draft.id) || '');
          savedTokens.current.set(draft.id, saved.writeToken);
          if (currentRef.current?.id === draft.id) setSaveStatus('已保存到本机');
        } catch (e) {
          if (currentRef.current?.id !== draft.id) return;
          setSaveStatus('尚未保存');
          if (e instanceof Error && e.message === 'CONFLICT') setConflict(true);
          else setError(e instanceof Error ? e.message : '保存失败，请下载项目备份。');
        }
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft, conflict]);

  useEffect(() => {
    if (saveStatus !== '保存中…' && saveStatus !== '尚未保存' && !conflict) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus, conflict]);

  async function fresh(example = false) {
    if (draft?.source && !confirm('新建一份草稿？当前内容会保留在本机草稿中。')) return;
    await saveChain.current;
    if (draft && !conflict) {
      try {
        const saved = await saveDraft(draft, savedTokens.current.get(draft.id) || '');
        savedTokens.current.set(draft.id, saved.writeToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : '请先备份当前内容。');
        return;
      }
    }
    const item = newDraft(example);
    const brand = await getBrand();
    if (brand) Object.assign(item, brand);
    adopt(item);
  }
  async function openDrafts() {
    try {
      await flushCurrent();
      setDrafts(await listDrafts());
      setShowDrafts(true);
    } catch {
      setError('无法保存或读取草稿，请先备份当前内容。');
    }
  }
  function manualBreak() {
    if (!draft) return;
    const at = textarea.current?.selectionStart ?? draft.source.length;
    update({
      ...draft,
      source: draft.source.slice(0, at) + '\n\n:::pagebreak\n\n' + draft.source.slice(at),
    });
    setMessage('已插入分页');
  }

  return {
    draft,
    update,
    adopt,
    fresh,
    undo,
    openDrafts,
    manualBreak,
    saveStatus,
    conflict,
    error,
    message,
    setError,
    setMessage,
    showDrafts,
    setShowDrafts,
    drafts,
    setDrafts,
    textarea,
    importer,
    past,
    future,
    flushCurrent,
  };
}
