import { ChevronLeft, ChevronRight, Download, FileArchive, FileText } from 'lucide-react';
import Preview from './Preview';
import { IconButton } from '../../../components/ui/IconButton';
import { Notice } from '../../../components/layout';
import { newDraft } from '../model';
import type { ArticleEditorState } from '../hooks/useArticleEditor';

const stageLabels: Record<string, string> = {
  queued: '排队中',
  validating: '检查内容',
  loading: '准备字体',
  paginating: '排版中',
  rendering: '生成图片',
  packaging: '打包中',
  finished: '生成完成',
};

export default function PreviewPanel({ state }: { state: ArticleEditorState }) {
  const {
    draft,
    update,
    currentResult,
    layoutState,
    count,
    index,
    layingOut,
    layoutError,
    job,
    activeJob,
    signature,
    jobContentKey,
    pollError,
    setPage,
    cancel,
  } = state;
  if (!draft) return null;
  return (
    <section className="preview-panel" aria-label="图片预览">
      <div className="preview-top">
        <h2>{currentResult ? '高清预览' : '预览'}</h2>
        <span>{layingOut ? '排版中…' : count ? `${count} 张` : ''}</span>
      </div>
      <div className="preview-stage">
        {currentResult && job ? (
          <img
            className="rendered-preview"
            src={job.outputs[index]?.url}
            alt={`第 ${index + 1} 页高清图片`}
          />
        ) : layoutState ? (
          <Preview
            snapshot={layoutState.snapshot}
            pagination={layoutState.pagination}
            index={index}
          />
        ) : (
          <div className="empty-paper">
            <FileText size={30} strokeWidth={1.3} aria-hidden="true" />
            <p>{draft.title || draft.source ? layoutError : '暂无内容'}</p>
            {!draft.source && !draft.title ? (
              <button
                className="button secondary"
                onClick={() => {
                  const sample = newDraft(true);
                  update({ ...draft, title: sample.title, source: sample.source });
                }}
              >
                载入示例
              </button>
            ) : null}
          </div>
        )}
      </div>
      {count ? (
        <div className="page-nav">
          <IconButton label="上一页" disabled={index === 0} onClick={() => setPage(index - 1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <span>
            {index + 1} <span>/ {count}</span>
          </span>
          <IconButton
            label="下一页"
            disabled={index >= count - 1}
            onClick={() => setPage(index + 1)}
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
      ) : null}
      {count > 1 ? (
        <div className="page-dots" aria-label="选择页面">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              className={i === index ? 'active' : ''}
              aria-label={`第 ${i + 1} 页`}
              aria-current={i === index ? 'page' : undefined}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      ) : null}
      <div className="preview-status" aria-live="polite">
        {activeJob && job ? (
          <>
            <span className="status-pulse" />
            {stageLabels[job.stage] || '生成中'}
            {job.progress.total ? ` ${job.progress.current}/${job.progress.total}` : ''}
            <button onClick={cancel}>取消</button>
          </>
        ) : currentResult ? (
          <span>已生成</span>
        ) : job?.expired ? (
          <span>图片已过期，请重新生成。</span>
        ) : job?.status === 'failed' ? (
          <span className="error-text">{job.error?.message || '生成失败，请重试。'}</span>
        ) : job?.status === 'cancelled' ? (
          <span>已取消</span>
        ) : job && jobContentKey !== signature ? (
          <span>内容已更新，请重新生成。</span>
        ) : null}
      </div>
      {pollError ? <Notice danger>{pollError} 正在尝试重新连接…</Notice> : null}
      {layoutError && (draft.source || draft.title) ? <Notice danger>{layoutError}</Notice> : null}
      {layoutState?.pagination.warnings.map((text) => (
        <p className="field-hint" key={text}>
          {text}
        </p>
      ))}
      {currentResult && job ? (
        <div className="download-actions">
          <a className="button primary" href={job.archiveUrl!}>
            <FileArchive size={16} />
            下载全部
          </a>
          <a className="button secondary" href={`${job.outputs[index]?.url}?download=1`}>
            <Download size={16} />
            当前页
          </a>
        </div>
      ) : null}
    </section>
  );
}
