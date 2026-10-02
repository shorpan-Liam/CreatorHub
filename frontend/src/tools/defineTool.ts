// The meta/service/component separation follows OmniTools (MIT).
import type { LazyExoticComponent, ComponentType } from 'react';

export interface ToolModule {
  slug: string;
  route: string;
  preview: string;
  component: LazyExoticComponent<ComponentType>;
}

export function defineTool(module: ToolModule): ToolModule {
  return module;
}
