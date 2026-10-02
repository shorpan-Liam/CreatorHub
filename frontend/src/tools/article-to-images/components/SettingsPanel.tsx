import PaddingSettings from './PaddingSettings';
import type { Draft } from '../model';
import { defaultLayout } from '../model';

export default function SettingsPanel({
  draft,
  update,
  upload,
  onDefault,
}: {
  draft: Draft;
  update: (d: Draft) => void;
  upload: (file: File) => void;
  onDefault: () => void;
}) {
  const layout = <K extends keyof Draft['layout']>(key: K, value: Draft['layout'][K]) =>
    update({ ...draft, layout: { ...draft.layout, [key]: value } });
  const brand = <K extends keyof Draft['brand']>(key: K, value: Draft['brand'][K]) =>
    update({ ...draft, brand: { ...draft.brand, [key]: value } });
  const range = (
    label: string,
    key: 'titleFontSize' | 'bodyFontSize' | 'lineHeight' | 'paragraphGap' | 'paddingX' | 'paddingY',
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="range-field">
      {label}
      <output>
        {draft.layout[key]}
        {key === 'lineHeight' ? '' : ' px'}
      </output>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={draft.layout[key]}
        onChange={(e) => layout(key, Number(e.target.value))}
      />
    </label>
  );
  return (
    <aside className="settings-panel">
      <div className="panel-heading">
        <h2>版式</h2>
        <button
          className="text-button muted"
          onClick={() => {
            if (confirm('恢复默认版式？文章、品牌和手动分页会保留。'))
              update({ ...draft, layout: { ...defaultLayout } });
          }}
        >
          重置
        </button>
      </div>
      <div className="settings-group">
        <h3>图片比例</h3>
        <div className="ratio-buttons">
          {[
            {
              height: 1440 as const,
              preset: 'portrait-3-4' as const,
              name: '3:4',
              text: '常规竖版',
            },
            { height: 1920 as const, preset: 'portrait-9-16' as const, name: '9:16', text: '高版' },
          ].map((x) => (
            <button
              key={x.preset}
              className={draft.layout.preset === x.preset ? 'active' : ''}
              aria-pressed={draft.layout.preset === x.preset}
              onClick={() =>
                update({
                  ...draft,
                  layout: { ...draft.layout, height: x.height, preset: x.preset },
                })
              }
            >
              <span className="ratio-icon" style={{ aspectRatio: x.name.replace(':', '/') }} />
              <strong>{x.name}</strong>
              <small>{x.text}</small>
            </button>
          ))}
        </div>
        <p className="field-hint">
          1080 × {draft.layout.height} px{draft.layout.height === 1920 ? ' · 上传后请检查裁切' : ''}
        </p>
      </div>
      <div className="settings-group">
        <h3>个人署名</h3>
        <label className="sr-only" htmlFor="brand-name">
          品牌名称
        </label>
        <input
          id="brand-name"
          className="field-input"
          value={draft.brand.name}
          onChange={(e) => {
            if ([...e.target.value].length <= 24) brand('name', e.target.value);
          }}
          placeholder="你的名字"
        />
        <div className="brand-controls">
          <label className="upload-button">
            {draft.logoDataUrl ? <img src={draft.logoDataUrl} alt="当前 Logo" /> : <span>＋</span>}
            <span>{draft.logoDataUrl ? '更换 Logo' : '添加 Logo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) upload(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
          {draft.logoDataUrl ? (
            <button
              className="text-button muted"
              onClick={() =>
                update({ ...draft, logoDataUrl: '', brand: { ...draft.brand, showLogo: false } })
              }
            >
              移除
            </button>
          ) : null}
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.brand.showName}
            onChange={(e) => brand('showName', e.target.checked)}
          />
          显示署名
        </label>
        {draft.logoDataUrl ? (
          <>
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.brand.showLogo}
                onChange={(e) => brand('showLogo', e.target.checked)}
              />
              显示 Logo
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={draft.brand.logoShape === 'circle'}
                onChange={(e) => brand('logoShape', e.target.checked ? 'circle' : 'original')}
              />
              圆形 Logo
            </label>
          </>
        ) : null}
        <button className="text-button subtle" onClick={onDefault}>
          设为默认署名
        </button>
      </div>
      <div className="settings-group">
        <h3>文字</h3>
        {range('标题字号', 'titleFontSize', 72, 128)}
        {range('正文字号', 'bodyFontSize', 32, 52)}
        <div className="font-note">
          Noto Serif SC <span>思源宋体风格</span>
        </div>
      </div>
      <PaddingSettings draft={draft} update={update} />
      <details className="advanced-settings">
        <summary>更多排版设置</summary>
        {range('行距', 'lineHeight', 1.4, 2, 0.1)}
        {range('段落间距', 'paragraphGap', 16, 72)}
        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.layout.titleAutoFit}
            onChange={(e) => layout('titleAutoFit', e.target.checked)}
          />
          标题字号自动适配
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.layout.titleUnderline}
            onChange={(e) => layout('titleUnderline', e.target.checked)}
          />
          标题强调线
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.layout.showPageNumber}
            onChange={(e) => layout('showPageNumber', e.target.checked)}
          />
          显示页码
        </label>
      </details>
      <div className="settings-group export-format">
        <label htmlFor="export-format">图片格式</label>
        <select
          id="export-format"
          value={draft.outputFormat}
          onChange={(e) =>
            update({ ...draft, outputFormat: e.target.value as Draft['outputFormat'] })
          }
        >
          <option value="png">PNG · 清晰文字</option>
          <option value="jpeg">JPG · 更小文件</option>
        </select>
      </div>
    </aside>
  );
}
