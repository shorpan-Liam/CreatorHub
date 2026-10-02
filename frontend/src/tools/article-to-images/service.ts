import { client } from '../../client';
import type { RenderRequest } from '../../client/types';

export async function getRender(id: string, signal?: AbortSignal) {
  const { data } = await client.GET('/api/v1/renders/{job_id}', {
    params: { path: { job_id: id } },
    signal,
  });
  return data!;
}

export async function createRender(body: RenderRequest, key: string) {
  const { data } = await client.POST('/api/v1/renders', {
    body,
    params: { header: { 'idempotency-key': key } },
  });
  return data!;
}

export async function cancelRender(id: string) {
  const { data } = await client.POST('/api/v1/renders/{job_id}/cancel', {
    params: { path: { job_id: id } },
  });
  return data!;
}
