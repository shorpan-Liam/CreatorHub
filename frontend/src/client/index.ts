import createClient from 'openapi-fetch';
import type { paths } from './schema.gen';
import { APIError } from './request';

export const client = createClient<paths>({ credentials: 'same-origin' });
client.use({
  async onResponse({ response }) {
    if (!response.ok) {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      throw new APIError(
        body?.error?.message || '服务暂不可用，请稍后重试。',
        response.status,
        body?.error?.code || 'REQUEST_FAILED',
      );
    }
  },
  onError({ error }) {
    if (error instanceof Error && error.name === 'AbortError') return error;
    return new Error('无法连接本地服务，内容仍保存在浏览器中。');
  },
});
