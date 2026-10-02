import { describe, expect, it } from 'vitest';
import { filterTools } from './filter';
import type { Tool } from '../../client/types';

const tool: Tool = {
  slug: 'article-to-images',
  name: '文章转图片',
  description: '文章排版',
  category: 'graphic-content',
  platforms: ['xiaohongshu'],
  keywords: ['分页'],
  status: 'available',
  route: '/tools/article-to-images',
  sortOrder: 10,
  iconKey: '',
};

describe('catalog selection', () => {
  it('searches localized platform names and ignores hidden tools', () => {
    expect(
      filterTools(
        [tool, { ...tool, slug: 'hidden', status: 'hidden' }],
        ' 小红书 ',
        'all',
        [],
        [],
      ).map((x) => x.slug),
    ).toEqual(['article-to-images']);
  });
  it('retains saved favorites and orders recent tools by usage', () => {
    const other = { ...tool, slug: 'other', sortOrder: 0 };
    expect(
      filterTools([tool, other], '', 'favorites', ['article-to-images'], []).map((x) => x.slug),
    ).toEqual(['article-to-images']);
    expect(
      filterTools([tool, other], '', 'recent', [], ['article-to-images', 'other']).map(
        (x) => x.slug,
      ),
    ).toEqual(['article-to-images', 'other']);
  });
});
