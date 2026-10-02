import { describe, expect, it } from 'vitest';
import { draftSchema, newDraft, parseSource, snapshotOf } from './model';

describe('article preservation and boundaries', () => {
  it('loads old drafts without a cover override and preserves expanded margins in backups', () => {
    const draft = newDraft();
    const { firstPagePaddingTop: _, ...oldLayout } = draft.layout;
    expect(
      draftSchema.parse({ ...draft, layout: oldLayout }).layout.firstPagePaddingTop,
    ).toBeNull();
    draft.layout = { ...draft.layout, paddingX: 320, paddingY: 480, firstPagePaddingTop: 720 };
    expect(draftSchema.parse(JSON.parse(JSON.stringify(draft))).layout).toEqual(draft.layout);
    expect(
      draftSchema.safeParse({ ...draft, layout: { ...draft.layout, paddingX: 321 } }).success,
    ).toBe(false);
    expect(
      draftSchema.safeParse({ ...draft, layout: { ...draft.layout, firstPagePaddingTop: -1 } })
        .success,
    ).toBe(false);
  });
  it('preserves plain-text soft breaks and spacing', () => {
    const input = '  第一行\n第二行  \n\n第三段';
    const { blocks } = parseSource(input, 'plain');
    expect(blocks.map((x) => x.runs.map((r) => r.text).join(''))).toEqual([
      '  第一行\n第二行  ',
      '第三段',
    ]);
  });
  it('keeps explicit page breaks and stable IDs', () => {
    const { blocks } = parseSource('相同\n\n:::pagebreak\n\n相同', 'plain');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'page_break', 'paragraph']);
    expect(new Set(blocks.map((b) => b.id)).size).toBe(3);
  });
  it('recognizes headings, lists and emphasis without running HTML', () => {
    const { blocks } = parseSource(
      '## 标题\n- **重点**\n> 引用\n\n<script>alert(1)</script>',
      'markdown',
    );
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list_item', 'quote', 'paragraph']);
    expect(blocks[1].runs[0]).toEqual({ text: '重点', bold: true });
    expect(blocks[3].runs[0].text).toContain('<script>');
  });
  it('retains linked destinations and unsupported table text', () => {
    const parsed = parseSource('[资料](https://example.com)\n\n| 一 | 二 |', 'markdown');
    expect(parsed.blocks[0].runs[0].text).toBe('资料（https://example.com）');
    expect(parsed.blocks[1].runs[0].text).toBe('| 一 | 二 |');
    expect(parsed.warnings.length).toBe(1);
  });
  it('rejects empty documents and over-limit visible content', () => {
    const draft = newDraft();
    expect(() => snapshotOf(draft)).toThrow('先写');
    draft.source = '字'.repeat(20001);
    expect(() => snapshotOf(draft)).toThrow('20,000');
  });
  it('counts Unicode code points consistently with Python', () => {
    const draft = newDraft();
    draft.title = '\u{1F600}'.repeat(100);
    expect(draftSchema.safeParse(draft).success).toBe(true);
    draft.title += '\u{1F600}';
    expect(draftSchema.safeParse(draft).success).toBe(false);
  });
  it('rejects a hostile backup or inconsistent preset', () => {
    const draft = newDraft();
    expect(draftSchema.safeParse({ ...draft, logoDataUrl: 'javascript:alert(1)' }).success).toBe(
      false,
    );
    expect(
      draftSchema.safeParse({ ...draft, layout: { ...draft.layout, height: 1920 } }).success,
    ).toBe(false);
    expect(draftSchema.safeParse({ ...draft, schemaVersion: 99 }).success).toBe(false);
  });
});
