import type { components, paths } from '@jira-lite/contracts';

export type ApiPaths = paths;
export type ApiComponents = components;
export type ApiPath = keyof ApiPaths;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

type Operation<P extends ApiPath, M extends HttpMethod> = ApiPaths[P][M];

type ResponsesOf<Op> = Op extends { responses: infer R } ? R : never;
export type ResponseStatus<P extends ApiPath, M extends HttpMethod> = keyof ResponsesOf<
  Operation<P, M>
>;

export type RequestJson<P extends ApiPath, M extends HttpMethod> = Operation<
  P,
  M
> extends {
  requestBody: { content: { 'application/json': infer Body } };
}
  ? Body
  : never;

export type ResponseJson<
  P extends ApiPath,
  M extends HttpMethod,
  S extends ResponseStatus<P, M>,
> = ResponsesOf<Operation<P, M>>[S] extends { content: { 'application/json': infer Body } }
  ? Body
  : never;

export type ErrorResponse = components['schemas']['ErrorResponse'];
