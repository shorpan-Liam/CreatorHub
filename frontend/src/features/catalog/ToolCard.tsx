import { Link } from 'react-router-dom';
import { Heart, ArrowUpRight, Wrench } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';
import { toolRegistry } from '../../tools';
import type { Tool } from '../../client/types';
import { platformNames } from './filter';

export function ToolCard({
  tool,
  favorite,
  onFavorite,
  draftId,
}: {
  tool: Tool;
  favorite: boolean;
  onFavorite: () => void;
  draftId: string;
}) {
  const module = toolRegistry.get(tool.slug);
  const cover = module ? (
    <img src={module.preview} alt="文章排版示例" width={360} height={480} loading="lazy" />
  ) : (
    <Wrench size={28} strokeWidth={1.4} />
  );
  const content = (
    <>
      <div className="repository-cover">{cover}</div>
      <div className="repository-card-info">
        <h2 title={tool.name}>{tool.name}</h2>
        {tool.description ? <p className="tool-description">{tool.description}</p> : null}
        <p className="tool-platforms">
          {tool.platforms.map((p) => platformNames[p] || p).join(' · ')}
        </p>
        {tool.status !== 'available' ? <span className="tool-unavailable">即将上线</span> : null}
      </div>
      {tool.status === 'available' ? (
        <ArrowUpRight className="tool-open-arrow" size={16} aria-hidden="true" />
      ) : null}
    </>
  );
  return (
    <article className="repository-card">
      {tool.status === 'available' ? (
        <Link className="repository-card-main" to={tool.route} aria-label={`打开${tool.name}`}>
          {content}
        </Link>
      ) : (
        <div className="repository-card-main">{content}</div>
      )}
      <IconButton
        className="repository-favorite"
        label={`${favorite ? '取消收藏' : '收藏'}${tool.name}`}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
      </IconButton>
      {draftId && tool.slug === 'article-to-images' && tool.status === 'available' ? (
        <Link className="repository-resume" to={`${tool.route}?draft=${draftId}`}>
          继续草稿
          <ArrowUpRight size={13} />
        </Link>
      ) : null}
    </article>
  );
}
