import { z } from 'zod';

export const layoutSchema = z
  .object({
    templateId: z.literal('classic-reading'),
    templateVersion: z.literal(1),
    preset: z.enum(['portrait-3-4', 'portrait-9-16']),
    width: z.literal(1080),
    height: z.union([z.literal(1440), z.literal(1920)]),
    titleFontSize: z.number().int().min(72).max(128),
    titleAutoFit: z.boolean(),
    bodyFontSize: z.number().int().min(32).max(52),
    lineHeight: z.number().min(1.4).max(2),
    paragraphGap: z.number().int().min(16).max(72),
    paddingX: z.number().int().min(0).max(320),
    paddingY: z.number().int().min(0).max(480),
    firstPagePaddingTop: z.number().int().min(0).max(720).nullable().default(null),
    titleUnderline: z.boolean(),
    showPageNumber: z.boolean(),
  })
  .strict()
  .refine((x) => x.height === (x.preset === 'portrait-3-4' ? 1440 : 1920), '图片比例与尺寸不一致');
const codepoints = (n: number) => z.string().refine((x) => [...x].length <= n, `最多 ${n} 字`);
export const brandSchema = z
  .object({
    name: codepoints(24),
    showName: z.boolean(),
    showLogo: z.boolean(),
    logoShape: z.enum(['circle', 'original']),
    fontSize: z.number().int().min(24).max(40),
  })
  .strict();
export const draftSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(80),
    revision: z.number().int().min(0),
    title: codepoints(100),
    source: codepoints(100000),
    sourceFormat: z.enum(['plain', 'markdown']),
    originalSource: codepoints(100000).default(''),
    layout: layoutSchema,
    brand: brandSchema,
    logoDataUrl: z
      .string()
      .max(7500000)
      .refine(
        (x) => x === '' || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x),
        'Logo 格式不受支持',
      ),
    outputFormat: z.enum(['png', 'jpeg']),
    savedAt: z.string(),
    writeToken: z.string(),
  })
  .strict();
export type Draft = z.infer<typeof draftSchema>;
export type Layout = Draft['layout'];
export interface Run {
  text: string;
  bold: boolean;
}
export interface Block {
  id: string;
  type: 'paragraph' | 'heading' | 'quote' | 'list_item' | 'page_break';
  runs: Run[];
  level?: 2 | 3;
  listId?: string;
  ordered?: boolean;
  ordinal?: number;
}
export interface Snapshot {
  schemaVersion: 1;
  draftId: string;
  revision: number;
  document: {
    title: string;
    sourceText: string;
    sourceFormat: 'plain' | 'markdown';
    blocks: Block[];
  };
  brand: Draft['brand'] & { logoAssetId: string | null };
  layout: Layout;
  output: { format: 'png' | 'jpeg' };
  logoDataUrl?: string;
}
export type { Tool, Job } from '../../client/types';

export const defaultLayout: Layout = {
  templateId: 'classic-reading',
  templateVersion: 1,
  preset: 'portrait-3-4',
  width: 1080,
  height: 1440,
  titleFontSize: 104,
  titleAutoFit: false,
  bodyFontSize: 40,
  lineHeight: 1.7,
  paragraphGap: 36,
  paddingX: 80,
  paddingY: 72,
  firstPagePaddingTop: null,
  titleUnderline: true,
  showPageNumber: true,
};
export const defaultBrand: Draft['brand'] = {
  name: '小潘同学',
  showName: true,
  showLogo: false,
  logoShape: 'circle',
  fontSize: 28,
};
export const exampleSource =
  '好的内容，值得被认真排版。\n\n我们常常花很多时间打磨一篇文章，却在最后一步，把文字挤进一张拥挤的图片里。字号太小，段落太长，读者还没开始读，就已经划走了。\n\n给文字一点空间\n\n留白不是浪费。它让一句话有停顿，让一个观点有分量，也让读者知道，哪里是新的开始。\n\n把长段落拆开，给标题一个清晰的位置。每一页只承载适量的信息，读起来就会轻松很多。\n\n让风格保持一致\n\n固定的署名、舒服的字号、统一的页边距，这些小小的细节，会慢慢形成你的辨识度。\n\n排版不需要复杂。把注意力还给文字，让好的表达，好好被看见。';
export function newDraft(example = false): Draft {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    revision: 0,
    title: example ? '让好的表达，\n好好被看见。' : '',
    source: example ? exampleSource : '',
    sourceFormat: 'plain',
    originalSource: '',
    layout: { ...defaultLayout },
    brand: { ...defaultBrand },
    logoDataUrl: '',
    outputFormat: 'png',
    savedAt: '',
    writeToken: '',
  };
}

function inline(text: string): Run[] {
  const expanded = text.replace(/(?<!!)\[([^\]]+)\]\(([^)]+)\)/g, '$1（$2）');
  const pieces = expanded.split(/(\*\*[^*]+\*\*)/g);
  return pieces
    .filter(Boolean)
    .map((x) =>
      x.startsWith('**') && x.endsWith('**')
        ? { text: x.slice(2, -2), bold: true }
        : { text: x, bold: false },
    );
}

export function parseSource(
  source: string,
  format: Draft['sourceFormat'],
): { blocks: Block[]; warnings: string[] } {
  const chunks = source.replace(/\r\n?/g, '\n').split(/\n[\t ]*\n+/);
  const blocks: Block[] = [];
  const warnings: string[] = [];
  let count = 0;
  const add = (type: Block['type'], text: string, more: Partial<Block> = {}, literal = false) => {
    blocks.push({
      id: `b${count++}`,
      type,
      runs:
        type === 'page_break'
          ? []
          : format === 'markdown' && !literal
            ? inline(text)
            : [{ text, bold: false }],
      ...more,
    });
  };
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    if (chunk.trim() === ':::pagebreak') {
      add('page_break', '');
      continue;
    }
    if (format === 'plain') {
      add('paragraph', chunk);
      continue;
    }
    if (/```|!\[|^\s*\||^\s{2,}[-*]/m.test(chunk)) {
      add('paragraph', chunk, {}, true);
      warnings.push('表格、图片、代码或嵌套列表按原样文本显示。');
      continue;
    }
    // Recognize structural lines even when a Markdown author omits blank lines.
    let paragraph: string[] = [];
    const flush = () => {
      if (paragraph.length) add('paragraph', paragraph.join('\n'));
      paragraph = [];
    };
    for (const line of chunk.split('\n')) {
      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      const list = line.match(/^(?:(\d+)\.|[-*])\s+(.+)$/);
      const quote = line.match(/^>\s?(.*)$/);
      if (heading) {
        flush();
        add('heading', heading[2], { level: heading[1].length === 3 ? 3 : 2 });
      } else if (list) {
        flush();
        add('list_item', list[2], {
          listId: 'list',
          ordered: !!list[1],
          ordinal: Number(list[1] || 1),
        });
      } else if (quote) {
        flush();
        add('quote', quote[1]);
      } else paragraph.push(line);
    }
    flush();
  }
  return { blocks, warnings: [...new Set(warnings)] };
}

export function snapshotOf(draft: Draft, assetId: string | null = null): Snapshot {
  const parsed = parseSource(draft.source, draft.sourceFormat);
  const text = parsed.blocks.flatMap((b) => b.runs.map((r) => r.text)).join('');
  if ([...text].length > 20000) throw new Error('正文最多 20,000 字，请拆分为多篇。');
  if (!text.trim() && !draft.title.trim()) throw new Error('先写一点内容，再生成图片。');
  return {
    schemaVersion: 1,
    draftId: draft.id,
    revision: draft.revision,
    document: {
      title: draft.title,
      sourceText: draft.source,
      sourceFormat: draft.sourceFormat,
      blocks: parsed.blocks,
    },
    brand: { ...draft.brand, logoAssetId: assetId },
    layout: draft.layout,
    output: { format: draft.outputFormat },
    logoDataUrl: draft.logoDataUrl,
  };
}

export function contentKey(draft: Draft): string {
  return JSON.stringify([
    draft.id,
    draft.title,
    draft.source,
    draft.sourceFormat,
    draft.layout,
    draft.brand,
    draft.logoDataUrl,
    draft.outputFormat,
  ]);
}
