import type { Tool } from '../../client/types';

export type CatalogScope = 'all' | 'favorites' | 'recent';
export const platformNames: Record<string, string> = {
  xiaohongshu: '小红书',
  douyin: '抖音',
  zhihu: '知乎',
};

export function filterTools(
  tools: Tool[],
  query: string,
  scope: CatalogScope,
  favorites: string[],
  recent: string[],
) {
  const needle = query.trim().toLocaleLowerCase();
  return tools
    .filter((tool) => {
      const searchable = [
        tool.name,
        tool.description,
        tool.category,
        ...tool.keywords,
        ...tool.platforms.map((p) => platformNames[p] || p),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        tool.status !== 'hidden' &&
        searchable.includes(needle) &&
        (scope === 'all' || (scope === 'favorites' ? favorites : recent).includes(tool.slug))
      );
    })
    .sort((a, b) =>
      scope === 'recent'
        ? recent.indexOf(a.slug) - recent.indexOf(b.slug)
        : a.sortOrder - b.sortOrder,
    );
}
