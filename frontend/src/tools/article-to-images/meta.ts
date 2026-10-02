import { lazy } from 'react';
import { defineTool } from '../defineTool';

export const tool = defineTool({
  slug: 'article-to-images',
  route: '/tools/article-to-images',
  preview: '/tool-previews/article-to-images.webp',
  component: lazy(() => import('./index')),
});
