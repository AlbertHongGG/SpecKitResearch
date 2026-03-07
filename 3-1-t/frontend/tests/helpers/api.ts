import { APIRequestContext, request } from '@playwright/test';

export async function createApiTestClient(baseURL: string) {
  return request.newContext({ baseURL });
}

export async function disposeApiTestClient(client: APIRequestContext) {
  await client.dispose();
}
