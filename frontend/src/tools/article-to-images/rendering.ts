import type { Block, Layout, Snapshot } from './model';

export interface Fragment {
  blockId: string;
  startUtf16: number;
  endUtf16: number;
}
export interface PageModel {
  fragments: Fragment[];
  title: boolean;
}
export interface Pagination {
  pages: PageModel[];
  titleFontSize: number;
  warnings: string[];
}
export class LayoutError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const serif = '"Noto Serif SC", serif';
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });
const textOf = (b: Block) => b.runs.map((r) => r.text).join('');
const element = (tag: string, style: Partial<CSSStyleDeclaration> = {}, text?: string) => {
  const el = document.createElement(tag);
  Object.assign(el.style, style);
  if (text !== undefined) el.textContent = text;
  return el;
};

function blockElement(block: Block, start: number, end: number, layout: Layout) {
  const el = element('div', {
    position: 'relative',
    fontFamily: serif,
    fontSize: `${block.type === 'heading' ? layout.bodyFontSize * 1.25 : layout.bodyFontSize}px`,
    fontWeight: block.type === 'heading' ? '700' : '400',
    lineHeight: String(layout.lineHeight),
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    lineBreak: 'strict',
    wordBreak: 'normal',
    textIndent: block.type === 'paragraph' && start === 0 ? '2em' : '0',
    margin: '0',
    padding: '0',
    marginBottom: `${layout.paragraphGap}px`,
  });
  el.dataset.blockId = block.id;
  if (block.type === 'quote')
    Object.assign(el.style, {
      paddingLeft: '28px',
      borderLeft: '3px solid #c9cbc5',
      color: '#50544d',
    });
  if (block.type === 'list_item') {
    el.style.paddingLeft = '64px';
    if (start === 0)
      el.append(
        element(
          'span',
          { position: 'absolute', left: '0', top: '0' },
          block.ordered ? `${block.ordinal}.` : '•',
        ),
      );
  }
  let offset = 0;
  for (const run of block.runs) {
    const from = Math.max(0, start - offset),
      to = Math.min(run.text.length, end - offset);
    if (to > from)
      el.append(
        element('span', { fontWeight: run.bold ? '700' : 'inherit' }, run.text.slice(from, to)),
      );
    offset += run.text.length;
  }
  return el;
}

function skeleton(snapshot: Snapshot, title: boolean, titleFontSize: number, firstPage = title) {
  const { layout, brand } = snapshot;
  // Older drafts follow the shared margin until a cover override is enabled.
  const topPadding = firstPage ? (layout.firstPagePaddingTop ?? layout.paddingY) : layout.paddingY;
  const page = element('article', {
    width: `${layout.width}px`,
    height: `${layout.height}px`,
    padding: `${topPadding}px ${layout.paddingX}px ${layout.paddingY}px`,
    boxSizing: 'border-box',
    background: '#fff',
    color: '#22251f',
    position: 'relative',
    flexShrink: '0',
    overflow: 'hidden',
  });
  const showBrand =
    (brand.showName && !!brand.name.trim()) || (brand.showLogo && !!snapshot.logoDataUrl);
  if (showBrand) {
    const header = element('header', {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      height: '52px',
      marginBottom: '40px',
      fontFamily: serif,
      fontSize: `${brand.fontSize}px`,
      letterSpacing: '1px',
    });
    if (brand.showLogo && snapshot.logoDataUrl) {
      const img = document.createElement('img');
      img.src = snapshot.logoDataUrl;
      img.alt = '';
      Object.assign(img.style, {
        width: '52px',
        height: '52px',
        objectFit: 'contain',
        borderRadius: brand.logoShape === 'circle' ? '50%' : '0',
      });
      header.append(img);
    }
    if (brand.showName) header.append(element('span', {}, brand.name));
    page.append(header);
  }
  const capacity =
    layout.height -
    topPadding -
    layout.paddingY -
    (showBrand ? 92 : 0) -
    (layout.showPageNumber ? 52 : 0);
  const flow = element('div', { height: `${capacity}px`, width: '100%', display: 'flow-root' });
  flow.dataset.flow = 'true';
  if (title && snapshot.document.title) {
    const heading = element('h1', {
      fontFamily: serif,
      fontSize: `${titleFontSize}px`,
      lineHeight: '1.38',
      fontWeight: '700',
      margin: '0 0 58px',
      whiteSpace: 'pre-wrap',
      overflowWrap: 'anywhere',
      lineBreak: 'strict',
      textWrap: 'balance',
      letterSpacing: '0',
    });
    const span = element('span', {}, snapshot.document.title);
    if (layout.titleUnderline)
      Object.assign(span.style, {
        textDecorationLine: 'underline',
        textDecorationColor: '#eceee8',
        textDecorationThickness: '14px',
        textUnderlineOffset: '-1px',
        textDecorationSkipInk: 'none',
      });
    heading.append(span);
    flow.append(heading);
  }
  page.append(flow);
  return { page, flow, capacity };
}

function fits(flow: HTMLElement, capacity: number) {
  const last = flow.lastElementChild as HTMLElement | null;
  return (
    !last ||
    last.getBoundingClientRect().bottom <= flow.getBoundingClientRect().top + capacity + 0.25
  );
}

export async function readyFonts(snapshot: Snapshot) {
  const text =
    snapshot.document.title + snapshot.brand.name + snapshot.document.blocks.map(textOf).join('');
  const unique = [...new Set([...text])].join('');
  await Promise.race([
    Promise.all([
      document.fonts.load(`400 40px ${serif}`, unique),
      document.fonts.load(`700 104px ${serif}`, unique),
    ]),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new LayoutError('FONT_LOAD_FAILED', '字体加载超时，请刷新后重试。')),
        30000,
      ),
    ),
  ]);
  await document.fonts.ready;
  if (
    !document.fonts.check(`400 40px ${serif}`, unique) ||
    !document.fonts.check(`700 104px ${serif}`, unique)
  )
    throw new LayoutError('FONT_LOAD_FAILED', '字体尚未准备好，请重试。');
}

export async function paginate(snapshot: Snapshot): Promise<Pagination> {
  await readyFonts(snapshot);
  const host = element('div', {
    position: 'absolute',
    left: '-100000px',
    top: '0',
    pointerEvents: 'none',
    width: '1080px',
  });
  document.body.append(host);
  const pages: PageModel[] = [];
  const warnings: string[] = [];
  const { layout } = snapshot;
  let titleFontSize = layout.titleFontSize;
  let current = skeleton(snapshot, true, titleFontSize);
  host.append(current.page);
  try {
    if (layout.titleAutoFit) {
      while (!fits(current.flow, current.capacity * 0.6) && titleFontSize > 72) {
        current.page.remove();
        titleFontSize -= 2;
        current = skeleton(snapshot, true, titleFontSize);
        host.append(current.page);
      }
    }
    if (!fits(current.flow, current.capacity))
      throw new LayoutError('TITLE_OVERFLOW', '标题超过一页，请调整字号或缩短标题。');
    pages.push({ fragments: [], title: !!snapshot.document.title });
    const hasContent = () =>
      pages[pages.length - 1].title || pages[pages.length - 1].fragments.length > 0;
    const nextPage = () => {
      if (pages.length >= 50)
        throw new LayoutError('PAGE_LIMIT_EXCEEDED', '内容超过 50 页，请拆分为多篇。');
      current = skeleton(snapshot, false, titleFontSize);
      host.append(current.page);
      pages.push({ fragments: [], title: false });
    };
    const freshCapacity = skeleton(snapshot, false, titleFontSize).capacity;
    const blocks = snapshot.document.blocks;
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (block.type === 'page_break') {
        if (hasContent() && blocks.slice(bi + 1).some((b) => b.type !== 'page_break' && textOf(b)))
          nextPage();
        else warnings.push('已合并首尾或连续的空白分页。');
        continue;
      }
      const full = textOf(block);
      if (!full) continue;
      let start = 0;
      while (start < full.length) {
        const whole = blockElement(block, start, full.length, layout);
        current.flow.append(whole);
        let good = fits(current.flow, current.capacity);
        const wholeHeight = whole.getBoundingClientRect().height;
        // Keep headings with at least two following lines when there is no explicit break.
        const next = blocks[bi + 1];
        if (good && block.type === 'heading' && next && next.type !== 'page_break') {
          const tail = blockElement(next, 0, textOf(next).length, layout);
          current.flow.append(tail);
          const room =
            current.flow.getBoundingClientRect().top +
            current.capacity -
            tail.getBoundingClientRect().top;
          good =
            room >=
            Math.min(
              tail.getBoundingClientRect().height,
              layout.bodyFontSize * layout.lineHeight * 2,
            );
          tail.remove();
        }
        if (good) {
          pages[pages.length - 1].fragments.push({
            blockId: block.id,
            startUtf16: start,
            endUtf16: full.length,
          });
          break;
        }
        whole.remove();
        if (wholeHeight <= freshCapacity && hasContent()) {
          nextPage();
          continue;
        }
        const boundaries = [...segmenter.segment(full.slice(start))].map(
          (s) => start + s.index + s.segment.length,
        );
        let lo = 0,
          hi = boundaries.length - 1,
          best = -1;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          const candidate = blockElement(block, start, boundaries[mid], layout);
          current.flow.append(candidate);
          const ok = fits(current.flow, current.capacity);
          candidate.remove();
          if (ok) {
            best = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        if (best < 0) {
          if (!hasContent())
            throw new LayoutError('BLOCK_OVERFLOW', '段落无法放入当前版式，请缩小字号。');
          nextPage();
          continue;
        }
        let end = boundaries[best];
        // Prefer a nearby sentence boundary, without leaving most of a page empty.
        const prefix = full.slice(start, end);
        const punctuation = [...prefix.matchAll(/[。！？；]\s*/g)].map(
          (m) => start + (m.index ?? 0) + m[0].length,
        );
        const preferred = punctuation.filter((p) => p >= start + (end - start) * 0.75).at(-1);
        if (preferred && boundaries.includes(preferred)) end = preferred;
        // Avoid opening a new page with closing punctuation.
        while (end > start && /^[，。！？；：、）】》”’]/.test(full.slice(end))) {
          const previous = boundaries.filter((p) => p < end).at(-1);
          if (!previous) break;
          end = previous;
        }
        let piece = blockElement(block, start, end, layout);
        current.flow.append(piece);
        if (
          piece.getBoundingClientRect().height < layout.bodyFontSize * layout.lineHeight * 1.9 &&
          hasContent()
        ) {
          piece.remove();
          nextPage();
          continue;
        }
        // If only one continuation line remains, move a line to the next page.
        const remainder = blockElement(block, end, full.length, layout);
        current.flow.append(remainder);
        const remainderHeight = remainder.getBoundingClientRect().height;
        remainder.remove();
        if (end < full.length && remainderHeight < layout.bodyFontSize * layout.lineHeight * 1.9) {
          const originalHeight = piece.getBoundingClientRect().height;
          for (let k = boundaries.indexOf(end) - 1; k >= 0; k--) {
            const test = blockElement(block, start, boundaries[k], layout);
            current.flow.append(test);
            const height = test.getBoundingClientRect().height;
            test.remove();
            if (height <= originalHeight - layout.bodyFontSize * layout.lineHeight + 1) {
              if (height >= layout.bodyFontSize * layout.lineHeight * 1.9) {
                end = boundaries[k];
                piece.remove();
                piece = blockElement(block, start, end, layout);
                current.flow.append(piece);
              }
              break;
            }
          }
        }
        if (end <= start) throw new LayoutError('BLOCK_OVERFLOW', '段落无法分页，请检查内容。');
        pages[pages.length - 1].fragments.push({
          blockId: block.id,
          startUtf16: start,
          endUtf16: end,
        });
        start = end;
        if (start < full.length) nextPage();
      }
    }
    for (const block of blocks.filter((b) => b.type !== 'page_break')) {
      const ranges = pages.flatMap((p) => p.fragments).filter((f) => f.blockId === block.id);
      let end = 0;
      for (const range of ranges) {
        if (range.startUtf16 !== end)
          throw new LayoutError('CONTENT_COVERAGE_FAILED', '分页完整性校验失败，请重试。');
        end = range.endUtf16;
      }
      if (end !== textOf(block).length)
        throw new LayoutError('CONTENT_COVERAGE_FAILED', '正文未完整输出，请重试。');
    }
    return { pages, titleFontSize, warnings: [...new Set(warnings)] };
  } finally {
    host.remove();
  }
}

export function buildPage(snapshot: Snapshot, pagination: Pagination, index: number): HTMLElement {
  const model = pagination.pages[index];
  const { page, flow } = skeleton(snapshot, model.title, pagination.titleFontSize, index === 0);
  const blocks = new Map(snapshot.document.blocks.map((b) => [b.id, b]));
  for (const part of model.fragments)
    flow.append(
      blockElement(blocks.get(part.blockId)!, part.startUtf16, part.endUtf16, snapshot.layout),
    );
  if (snapshot.layout.showPageNumber) {
    page.append(
      element(
        'footer',
        {
          position: 'absolute',
          bottom: `${snapshot.layout.paddingY}px`,
          left: `${snapshot.layout.paddingX}px`,
          right: `${snapshot.layout.paddingX}px`,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: serif,
          fontSize: '23px',
          color: '#93988b',
          borderTop: '1px solid #e9ebe5',
          paddingTop: '16px',
        },
        `${String(index + 1).padStart(2, '0')} / ${String(pagination.pages.length).padStart(2, '0')}`,
      ),
    );
  }
  page.dataset.renderPage = String(index + 1);
  return page;
}

declare global {
  interface Window {
    renderCreatorHub?: (snapshot: Snapshot) => void;
    creatorHubResult?: { manifest?: unknown; error?: { code: string; message: string } };
  }
}

export function initializeRenderer(host: HTMLElement) {
  window.renderCreatorHub = async (snapshot) => {
    window.creatorHubResult = undefined;
    try {
      const result = await paginate(snapshot);
      host.replaceChildren(...result.pages.map((_, i) => buildPage(snapshot, result, i)));
      await Promise.all([...host.querySelectorAll('img')].map((img) => img.decode()));
      for (const flow of host.querySelectorAll<HTMLElement>('[data-flow]')) {
        if (!fits(flow, flow.clientHeight))
          throw new LayoutError('BLOCK_OVERFLOW', '导出边界校验未通过，请调整版式。');
      }
      window.creatorHubResult = {
        manifest: {
          layoutVersion: '1',
          pageCount: result.pages.length,
          pages: result.pages.map((p, i) => ({ page: i + 1, fragments: p.fragments })),
          warnings: result.warnings,
        },
      };
    } catch (e) {
      window.creatorHubResult = {
        error: {
          code: e instanceof LayoutError ? e.code : 'LAYOUT_FAILED',
          message: e instanceof Error ? e.message : '排版失败',
        },
      };
    }
  };
}
