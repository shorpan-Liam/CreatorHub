import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { listDrafts, readPreference, writePreference } from '../../lib/storage';
import { Notice } from '../../components/layout';
import { IconButton } from '../../components/ui/IconButton';
import { useCatalog } from './useCatalog';
import { filterTools, type CatalogScope } from './filter';
import { ToolCard } from './ToolCard';
import './catalog.css';

export default function Repository({ embedded = false }: { embedded?: boolean }) {
  const catalog = useCatalog();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<CatalogScope>('all');
  const [favorites, setFavorites] = useState<string[]>(() => readPreference('favorites', []));
  const [recent] = useState<string[]>(() => readPreference('recent', []));
  const [draftId, setDraftId] = useState('');
  useEffect(() => {
    let alive = true;
    listDrafts()
      .then((rows) => {
        if (alive) setDraftId(rows[0]?.id || '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  function toggleFavorite(slug: string) {
    setFavorites((previous) => {
      const next = previous.includes(slug)
        ? previous.filter((x) => x !== slug)
        : [...previous, slug];
      writePreference('favorites', next);
      return next;
    });
  }
  const tools = filterTools(catalog.data || [], query, scope, favorites, recent);
  const Container = embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  return (
    <Container
      className={`tool-repository${embedded ? ' repository-embedded' : ''}`}
      aria-label="创作工具仓库"
    >
      <div className="repository-toolbar">
        <Heading>创作工具仓库</Heading>
        <div className="repository-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="搜索工具"
            placeholder="搜索工具、平台"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <IconButton label="清除搜索" onClick={() => setQuery('')}>
              <X size={14} />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div className="repository-tabs" role="group" aria-label="工具范围">
        {(
          [
            ['all', '全部'],
            ['favorites', '收藏'],
            ['recent', '最近使用'],
          ] as const
        ).map(([id, label]) => (
          <button aria-pressed={scope === id} key={id} onClick={() => setScope(id)}>
            {label}
          </button>
        ))}
      </div>
      {catalog.error ? (
        <Notice danger>
          {catalog.error.message}
          <button onClick={() => catalog.refetch()}>重试</button>
        </Notice>
      ) : catalog.isPending ? (
        <div className="repository-skeleton" role="status" aria-label="正在载入工具" />
      ) : tools.length ? (
        <div className="tool-waterfall">
          {tools.map((tool) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              favorite={favorites.includes(tool.slug)}
              onFavorite={() => toggleFavorite(tool.slug)}
              draftId={draftId}
            />
          ))}
        </div>
      ) : (
        <div className="repository-empty">
          <p>
            {scope === 'favorites'
              ? '暂无收藏'
              : scope === 'recent'
                ? '暂无使用记录'
                : '未找到工具'}
          </p>
          <button
            className="text-button"
            onClick={() => {
              setQuery('');
              setScope('all');
            }}
          >
            查看全部
          </button>
        </div>
      )}
    </Container>
  );
}
