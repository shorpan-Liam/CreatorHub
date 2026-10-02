import { Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ArrowLeft, FolderOpen, Image, Loader2, MoreHorizontal, PanelRight, X } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';
import { Notice } from '../../components/layout';
import { exportDraft, importDraft, loadDraft } from '../../lib/storage';
import { useArticleEditor } from './hooks/useArticleEditor';
import ContentPanel from './components/ContentPanel';
import PreviewPanel from './components/PreviewPanel';
import DraftDialog from './components/DraftDialog';
import SettingsPanel from './components/SettingsPanel';

export default function ArticleToImages() {
  const state = useArticleEditor();
  const {
    draft,
    showSettings,
    setShowSettings,
    mobileTab,
    setMobileTab,
    saveStatus,
    submitting,
    activeJob,
    generate,
    error,
    message,
    conflict,
    setError,
    setMessage,
    adopt,
    openDrafts,
    fresh,
    importer,
    flushCurrent,
  } = state;
  if (!draft) return <main className="loading-page">正在准备工作区…</main>;
  const copy = () =>
    adopt({ ...draft, id: crypto.randomUUID(), revision: 0, writeToken: '', savedAt: '' });
  return (
    <main className={`editor ${showSettings ? 'settings-open' : ''}`} data-mobile-tab={mobileTab}>
      <div className="editor-top">
        <div className="editor-title">
          <Link className="icon-button" to="/tools" aria-label="返回工具库" title="返回工具库">
            <ArrowLeft size={18} />
          </Link>
          <h1>文章转图片</h1>
          <span className="save-status" role="status">
            {saveStatus}
          </span>
        </div>
        <div className="editor-actions">
          <IconButton label="本机草稿" onClick={openDrafts}>
            <FolderOpen size={18} />
          </IconButton>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="icon-button" aria-label="更多操作" title="更多操作">
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-menu" align="end" sideOffset={8}>
                <DropdownMenu.Item onSelect={() => fresh()}>新建空白草稿</DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => fresh(true)}>载入示例文章</DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => exportDraft(draft)}>
                  备份项目文件
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => importer.current?.click()}>
                  导入项目文件
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={copy}>保存为副本</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <IconButton
            label="版式设置"
            className="settings-toggle"
            aria-pressed={showSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            <PanelRight size={18} />
          </IconButton>
          <button
            className="button primary generate"
            onClick={generate}
            disabled={submitting || activeJob || (!draft.title.trim() && !draft.source.trim())}
          >
            {submitting || activeJob ? <Loader2 className="spin" size={16} /> : <Image size={16} />}
            {submitting ? '准备中' : activeJob ? '生成中' : '生成图片'}
          </button>
        </div>
      </div>
      <input
        hidden
        ref={importer}
        type="file"
        accept=".json"
        onChange={async (e) => {
          try {
            if (e.target.files?.[0]) {
              const item = await importDraft(e.target.files[0]);
              if (draft.source && !confirm('导入为新草稿？当前草稿会保留。')) return;
              await flushCurrent();
              adopt(item);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : '导入失败');
          } finally {
            e.target.value = '';
          }
        }}
      />
      <div className="editor-feedback">
        {error ? (
          <Notice danger>
            {error}
            <IconButton label="关闭错误提示" onClick={() => setError('')}>
              <X size={14} />
            </IconButton>
          </Notice>
        ) : null}
        {message ? (
          <Notice>
            {message}
            <IconButton label="关闭提示" onClick={() => setMessage('')}>
              <X size={14} />
            </IconButton>
          </Notice>
        ) : null}
        {conflict ? (
          <Notice danger>
            另一标签页更新了这份草稿。
            <button
              onClick={async () => {
                const latest = await loadDraft(draft.id);
                if (latest) adopt(latest);
              }}
            >
              重新载入
            </button>
            <button onClick={copy}>保存副本</button>
          </Notice>
        ) : null}
      </div>
      <div className="mobile-tabs" role="tablist" aria-label="编辑区域">
        {[
          ['content', '内容'],
          ['preview', '预览'],
          ['settings', '版式'],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={mobileTab === key}
            key={key}
            onClick={() => setMobileTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="editor-workspace">
        <ContentPanel state={state} />
        <PreviewPanel state={state} />
        <SettingsPanel
          draft={draft}
          update={state.update}
          upload={state.upload}
          onDefault={state.setDefaultBrand}
        />
      </div>
      <DraftDialog state={state} />
    </main>
  );
}
