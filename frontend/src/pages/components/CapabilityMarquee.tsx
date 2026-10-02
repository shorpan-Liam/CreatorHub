import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useInView } from 'motion/react';
import { useReducedAnimation } from './LandingMotion';
import {
  Check,
  Download,
  FileText,
  FolderHeart,
  LayoutTemplate,
  Pause,
  Play,
  ScanLine,
  SlidersHorizontal,
  Type,
} from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';

const rows = [
  [
    { label: '文字排版', icon: FileText },
    { label: '个人署名', icon: Type },
    { label: '版式调整', icon: LayoutTemplate },
    { label: '草稿保存', icon: FolderHeart },
    { label: '图片导出', icon: Download },
  ],
  [
    { label: '个人 Logo', icon: Type },
    { label: '手动分页', icon: ScanLine },
    { label: 'PNG / JPG', icon: Download },
    { label: 'ZIP 打包', icon: FolderHeart },
    { label: '撤销重做', icon: Check },
  ],
  [
    { label: 'Markdown', icon: FileText },
    { label: '两种比例', icon: ScanLine },
    { label: '自由留白', icon: SlidersHorizontal },
    { label: '边距收藏', icon: FolderHeart },
    { label: '保留原文', icon: Check },
  ],
];

// TweakCN's duplicated marquee rows, paused outside the viewport and on interaction.
export function CapabilityMarquee() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const reduced = useReducedAnimation();
  const [paused, setPaused] = useState(false);
  return (
    <div
      ref={ref}
      className="landing-capability-strip"
      aria-label="创作能力"
      data-paused={paused || !visible || !!reduced}
    >
      <div className="landing-marquee-rows">
        {rows.map((items, row) => (
          <div className="landing-marquee-row" key={row}>
            <div
              className="landing-marquee-track"
              style={
                {
                  '--marquee-offset': row === 1 ? '-100px' : '0px',
                  '--marquee-distance': `${items.length * 216}px`,
                  '--marquee-duration': `${items.length * 5}s`,
                } as CSSProperties
              }
            >
              {[0, 1, 2, 3].map((copy) => (
                <div
                  className={`landing-marquee-group${copy ? ' marquee-copy' : ''}`}
                  aria-hidden={copy ? true : undefined}
                  key={copy}
                >
                  {items.map(({ label, icon: Icon }, index) => (
                    <span className={`landing-capability color-${index}`} key={label}>
                      <Icon size={15} aria-hidden="true" />
                      {label}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!reduced ? (
        <IconButton
          className="landing-marquee-control"
          label={paused ? '播放创作能力展示' : '暂停创作能力展示'}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </IconButton>
      ) : null}
    </div>
  );
}
