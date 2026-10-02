import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X } from 'lucide-react';
import { IconButton } from '../../../components/ui/IconButton';
import { deleteDraft, listDrafts } from '../../../lib/storage';
import { newDraft } from '../model';
import type { ArticleEditorState } from '../hooks/useArticleEditor';

export default function DraftDialog({ state }: { state: ArticleEditorState }) {
  const { showDrafts, setShowDrafts, drafts, setDrafts, adopt, draft, setError } = state;
  return (
    <Dialog.Root open={showDrafts} onOpenChange={setShowDrafts}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop" />
        <Dialog.Content className="draft-modal">
          <div className="panel-heading">
            <Dialog.Title>
              本机草稿 <span className="count">{drafts.length}/20</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="关闭草稿列表" title="关闭草稿列表">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted">保存在当前浏览器</Dialog.Description>
          {drafts.length ? (
            drafts.map((item) => (
              <div className="draft-row" key={item.id}>
                <button
                  onClick={() => {
                    adopt(item);
                    setShowDrafts(false);
                  }}
                >
                  <strong>{item.title.replace(/\n/g, ' ') || '未命名草稿'}</strong>
                  <span>
                    {new Date(item.savedAt).toLocaleString('zh-CN')} · {[...item.source].length} 字
                  </span>
                </button>
                <IconButton
                  label={`删除${item.title || '未命名草稿'}`}
                  onClick={async () => {
                    if (!confirm('删除这份本机草稿？')) return;
                    try {
                      await deleteDraft(item.id);
                      setDrafts(await listDrafts());
                      if (item.id === draft?.id) adopt(newDraft());
                    } catch {
                      setError('删除草稿失败');
                    }
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))
          ) : (
            <p className="empty-state">暂无草稿</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
