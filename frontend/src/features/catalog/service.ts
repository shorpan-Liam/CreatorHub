import { client } from '../../client';

export async function getTools(signal?: AbortSignal) {
  const { data } = await client.GET('/api/v1/tools', { signal });
  return data!.items;
}
