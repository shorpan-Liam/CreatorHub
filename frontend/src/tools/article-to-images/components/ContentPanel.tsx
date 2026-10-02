import { Undo2, Redo2, Scissors } from 'lucide-react';
import { IconButton } from '../../../components/ui/IconButton';
import type { ArticleEditorState } from '../hooks/useArticleEditor';

export default function ContentPanel({ state }: { state: ArticleEditorState }) {
  const { draft, update, textarea, past, future, undo, manualBreak, parsed, setError } = state;
  if (!draft) return null;
  return (
    <section className="content-panel" aria-label="文章编辑">
      <div className="panel-heading">
        <h2>内容</h2>
        <div className="undo-controls">
          <IconButton label="撤销" disabled={!past.current.length} onClick={() => undo()}>
            <Undo2 size={16} />
          </IconButton>
          <IconButton label="重做" disabled={!future.current.length} onClick={() => undo(true)}>
            <Redo2 size={16} />
          </IconButton>
        </div>
      </div>
      <label className="field-label" htmlFor="article-title">
        标题
      </label>
      <textarea
        id="article-title"
        className="title-input"
        value={draft.title}
        rows={3}
        placeholder="输入标题"
        onChange={(e) => {
          if ([...e.target.value].length <= 100) update({ ...draft, title: e.target.value });
        }}
      />
      <div className="body-label">
        <label htmlFor="article-body">正文</label>
        <select
          aria-label="输入格式"
          value={draft.sourceFormat}
          onChange={(e) =>
            update({ ...draft, sourceFormat: e.target.value as typeof draft.sourceFormat })
          }
        >
          <option value="plain">纯文本</option>
          <option value="markdown">Markdown</option>
        </select>
      </div>
      <textarea
        id="article-body"
        ref={textarea}
        className="body-input"
        value={draft.source}
        placeholder="粘贴文章正文"
        onChange={(e) => update({ ...draft, source: e.target.value })}
      />
      <div className="body-tools">
        <button className="text-button" onClick={manualBreak}>
          <Scissors size={14} />
          插入分页
        </button>
        <span>{[...draft.source].length.toLocaleString()} 字</span>
      </div>
      <details className="content-more">
        <summary>内容整理</summary>
        <button
          onClick={() =>
            update({
              ...draft,
              originalSource: draft.originalSource || draft.source,
              source: draft.source.replace(/([^\n])\n(?!\n|:::pagebreak)/g, '$1'),
            })
          }
        >
          合并段内换行
        </button>
        {draft.sourceFormat === 'markdown' && !draft.title && /^#\s+.+/m.test(draft.source) ? (
          <button
            onClick={() => {
              const match = draft.source.match(/^#\s+(.+)\n?/m);
              if (match && [...match[1]].length > 100) {
                setError('标题超过 100 字，请先缩短。');
                return;
              }
              if (match)
                update({
                  ...draft,
                  originalSource: draft.originalSource || draft.source,
                  title: match[1],
                  source: draft.source.replace(match[0], ''),
                });
            }}
          >
            提取一级标题
          </button>
        ) : null}
        {draft.originalSource ? (
          <button
            onClick={() => {
              if (confirm('恢复整理前的源文本？可使用撤销返回。'))
                update({ ...draft, source: draft.originalSource });
            }}
          >
            恢复原文
          </button>
        ) : null}
      </details>
      {parsed.warnings.map((text) => (
        <p className="field-hint" key={text}>
          {text}
        </p>
      ))}
    </section>
  );
}
