import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, X, ZoomIn } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';
import { Reveal } from './LandingMotion';

const examples = [
  {
    src: '/tool-previews/landing-writing.webp',
    title: '清晰的文字排版',
    alt: 'CreatorHub 生成的创作笔记，展示大标题和首行缩进',
  },
  {
    src: '/tool-previews/article-to-images.webp',
    title: '一致的个人风格',
    alt: 'CreatorHub 生成的阅读笔记，展示段落和个人署名',
  },
  {
    src: '/tool-previews/landing-sharing.webp',
    title: '恰到好处的留白',
    alt: 'CreatorHub 生成的分享笔记，展示图片留白',
  },
];

export default function LandingShowcase() {
  const [selected, setSelected] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const sample = examples[selected ?? 0];
  const move = (offset: number) =>
    setSelected((index) =>
      index === null ? null : (index + offset + examples.length) % examples.length,
    );
  return (
    <section
      className="landing-showcase ch:relative ch:isolate ch:w-full ch:py-20 ch:md:py-32"
      aria-labelledby="showcase-title"
    >
      <div className="landing-container ch:container ch:mx-auto ch:px-4 ch:md:px-6">
        <Reveal className="landing-section-heading ch:flex ch:flex-col ch:items-center ch:justify-center ch:space-y-4 ch:text-center">
          <h2
            id="showcase-title"
            className="ch:text-3xl ch:font-bold ch:md:text-5xl ch:lg:text-6xl"
          >
            从一篇文字，到一组作品
          </h2>
          <p className="ch:text-muted-foreground ch:max-w-[600px] ch:text-lg ch:md:text-xl">
            大标题、清晰段落、自己的署名。把注意力留给内容。
          </p>
        </Reveal>
        <Dialog.Root
          open={selected !== null}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <div className="landing-preview-gallery">
            {examples.map(({ src, title, alt }, index) => (
              <Reveal key={src} delay={index * 0.1} className="landing-preview-item">
                <figure>
                  <button
                    type="button"
                    className="landing-preview-open"
                    aria-label={`查看${title}`}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      setSelected(index);
                    }}
                  >
                    <img src={src} alt={alt} width={360} height={480} loading="lazy" />
                    <span className="landing-preview-zoom" aria-hidden="true">
                      <ZoomIn size={19} />
                    </span>
                  </button>
                  <figcaption>{title}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <Dialog.Portal>
            <Dialog.Overlay className="landing-image-overlay" />
            <Dialog.Content
              className="landing-image-viewer"
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus();
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  move(event.key === 'ArrowLeft' ? -1 : 1);
                }
              }}
            >
              <div className="landing-image-toolbar">
                <div>
                  <Dialog.Title>{sample.title}</Dialog.Title>
                  <Dialog.Description>CreatorHub 实际导出的排版样例</Dialog.Description>
                </div>
                <div className="landing-image-controls">
                  <span>
                    {(selected ?? 0) + 1} / {examples.length}
                  </span>
                  <IconButton label="上一张样例" onClick={() => move(-1)}>
                    <ArrowLeft size={18} />
                  </IconButton>
                  <IconButton label="下一张样例" onClick={() => move(1)}>
                    <ArrowRight size={18} />
                  </IconButton>
                  <Dialog.Close asChild>
                    <IconButton label="关闭图片预览">
                      <X size={19} />
                    </IconButton>
                  </Dialog.Close>
                </div>
              </div>
              <img
                className="landing-image-full"
                src={sample.src}
                alt={sample.alt}
                width={360}
                height={480}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </section>
  );
}
