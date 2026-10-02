export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { credentials: 'same-origin', ...options });
  } catch {
    throw new Error('无法连接本地服务，内容仍保存在浏览器中。');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new APIError(
      body?.error?.message || '服务暂不可用，请稍后重试。',
      response.status,
      body?.error?.code || 'REQUEST_FAILED',
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
let connecting: Promise<void> | null = null;
export function connect() {
  if (!connecting)
    connecting = api<void>('/session', { method: 'POST' }).finally(() => {
      connecting = null;
    });
  return connecting;
}
