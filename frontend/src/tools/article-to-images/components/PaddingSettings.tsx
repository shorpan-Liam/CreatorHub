import { useEffect, useState } from 'react';
import type { Draft } from '../model';
import {
  getPaddingPresets,
  savePaddingPreset,
  deletePaddingPreset,
  type PaddingPreset,
} from '../../../lib/storage';

function MarginInput({
  label,
  value,
  max,
  change,
}: {
  label: string;
  value: number;
  max: number;
  change: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <div className="margin-field">
      <div>
        <span>{label}</span>
        <label>
          <input
            aria-label={`${label}数值`}
            type="number"
            min={0}
            max={max}
            step={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isInteger(n) && n >= 0 && n <= max) change(n);
            }}
            onBlur={() => {
              const n = Math.min(max, Math.max(0, Math.round(Number(text) || 0)));
              setText(String(n));
              change(n);
            }}
          />{' '}
          px
        </label>
      </div>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => change(Number(e.target.value))}
      />
    </div>
  );
}

export default function PaddingSettings({
  draft,
  update,
}: {
  draft: Draft;
  update: (d: Draft) => void;
}) {
  const [presets, setPresets] = useState<PaddingPreset[]>([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    getPaddingPresets()
      .then((rows) => {
        if (active) setPresets(rows);
      })
      .catch(() => {
        if (active) setMessage('无法读取本机收藏。');
      });
    return () => {
      active = false;
    };
  }, []);
  const change = (patch: Partial<Draft['layout']>) =>
    update({ ...draft, layout: { ...draft.layout, ...patch } });
  const chosen = presets.find((p) => p.id === selected);
  async function save() {
    const clean = name.trim();
    if (!clean) {
      setMessage('请先为这套边距取个名字。');
      return;
    }
    if (presets.some((p) => p.name === clean) && !confirm(`覆盖“${clean}”的边距设置？`)) return;
    setBusy(true);
    try {
      const preset = {
        id: crypto.randomUUID(),
        name: clean,
        paddingX: draft.layout.paddingX,
        paddingY: draft.layout.paddingY,
        firstPagePaddingTop: draft.layout.firstPagePaddingTop,
      };
      await savePaddingPreset(preset);
      setPresets(await getPaddingPresets());
      setSelected(preset.id);
      setName('');
      setMessage('已收藏，下次可一键套用。');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '收藏失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!chosen || !confirm(`删除边距收藏“${chosen.name}”？`)) return;
    setBusy(true);
    try {
      await deletePaddingPreset(chosen.id);
      setPresets(await getPaddingPresets());
      setSelected('');
      setMessage('已删除收藏，当前边距保留。');
    } catch {
      setMessage('删除失败，请重试。');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-group padding-settings">
      <h3>内容边距</h3>
      <MarginInput
        label="左右留白"
        value={draft.layout.paddingX}
        max={320}
        change={(paddingX) => change({ paddingX })}
      />
      <MarginInput
        label="上下留白"
        value={draft.layout.paddingY}
        max={480}
        change={(paddingY) => change({ paddingY })}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.layout.firstPagePaddingTop !== null}
          onChange={(e) =>
            change({ firstPagePaddingTop: e.target.checked ? draft.layout.paddingY : null })
          }
        />
        首页顶部单独调整
      </label>
      {draft.layout.firstPagePaddingTop !== null && (
        <MarginInput
          label="首页顶部留白"
          value={draft.layout.firstPagePaddingTop}
          max={720}
          change={(firstPagePaddingTop) => change({ firstPagePaddingTop })}
        />
      )}
      <div className="padding-preset-save">
        <input
          className="field-input"
          aria-label="边距收藏名称"
          placeholder="给这套边距取个名字"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="text-button" disabled={busy} onClick={save}>
          收藏当前边距
        </button>
      </div>
      {presets.length > 0 && (
        <div className="padding-preset-load">
          <select
            className="field-input"
            aria-label="已收藏的边距"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">选择边距收藏</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div>
            <button
              className="text-button"
              disabled={!chosen || busy}
              onClick={() => {
                if (chosen) {
                  change({
                    paddingX: chosen.paddingX,
                    paddingY: chosen.paddingY,
                    firstPagePaddingTop: chosen.firstPagePaddingTop,
                  });
                  setMessage(`已套用“${chosen.name}”。`);
                }
              }}
            >
              套用
            </button>
            <button className="text-button muted" disabled={!chosen || busy} onClick={remove}>
              删除
            </button>
          </div>
        </div>
      )}
      <p className="field-hint">收藏仅保存在当前浏览器，套用只修改边距。</p>
      <p className="field-hint" role="status">
        {message}
      </p>
    </section>
  );
}
