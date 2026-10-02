import { tool as articleToImages } from './article-to-images/meta';

export const toolModules = [articleToImages];
export const toolRegistry = new Map(toolModules.map((tool) => [tool.slug, tool]));
