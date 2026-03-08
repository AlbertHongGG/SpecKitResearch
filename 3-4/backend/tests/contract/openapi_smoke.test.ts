import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

import { createTestApp } from '../helpers/testApp';
import { bootstrapCsrf } from '../helpers/auth';
import { authHeaders, loginAs } from '../helpers/auth';

type Operation = { path: string; method: string };

type OpenApiSpec = any;

function getOpenApiPathSegments(ref: string): string[] {
  // Only supports local refs like: #/components/schemas/Foo
  if (!ref.startsWith('#/')) throw new Error(`unsupported $ref: ${ref}`);
  return ref.slice(2).split('/').map((s) => decodeURIComponent(s));
}

function resolveRef(spec: OpenApiSpec, ref: string): any {
  const segs = getOpenApiPathSegments(ref);
  let cur: any = spec;
  for (const s of segs) {
    cur = cur?.[s];
  }
  if (!cur) throw new Error(`unresolved $ref: ${ref}`);
  return cur;
}

function normalizeSchema(spec: OpenApiSpec, schema: any, seen = new Set<any>()): any {
  if (!schema || typeof schema !== 'object') return schema;
  if (seen.has(schema)) return schema;
  seen.add(schema);

  if (schema.$ref) {
    return normalizeSchema(spec, resolveRef(spec, schema.$ref), seen);
  }

  const out: any = Array.isArray(schema) ? [] : { ...schema };
  if (out && typeof out === 'object') {
    if (out.nullable === true) {
      delete out.nullable;
      if (out.type) {
        out.type = Array.isArray(out.type) ? Array.from(new Set([...out.type, 'null'])) : [out.type, 'null'];
      } else if (out.anyOf || out.oneOf) {
        out.anyOf = [...(out.anyOf ?? []), { type: 'null' }];
      } else {
        // OpenAPI commonly uses nullable without an explicit type; model as "anything or null".
        out.anyOf = [{}, { type: 'null' }];
      }
    }

    for (const key of ['properties', 'items', 'allOf', 'anyOf', 'oneOf', 'not', 'additionalProperties']) {
      if (out[key] && typeof out[key] === 'object') {
        if (Array.isArray(out[key])) {
          out[key] = out[key].map((s: any) => normalizeSchema(spec, s, seen));
        } else if (key === 'properties') {
          const next: Record<string, any> = {};
          for (const [prop, propSchema] of Object.entries(out.properties)) {
            next[prop] = normalizeSchema(spec, propSchema, seen);
          }
          out.properties = next;
        } else if (key === 'additionalProperties' && out.additionalProperties !== true) {
          out.additionalProperties = normalizeSchema(spec, out.additionalProperties, seen);
        } else {
          out[key] = normalizeSchema(spec, out[key], seen);
        }
      }
    }
  }

  return out;
}

function getResponseJsonSchema(spec: OpenApiSpec, input: { path: string; method: string; status: string }): any {
  const op = spec?.paths?.[input.path]?.[input.method.toLowerCase()];
  if (!op) throw new Error(`operation not found in OpenAPI: ${input.method} ${input.path}`);

  const res = op?.responses?.[input.status];
  const schema = res?.content?.['application/json']?.schema;
  if (!schema) throw new Error(`response schema not found: ${input.method} ${input.path} ${input.status}`);

  return normalizeSchema(spec, schema);
}

function parseOperationsFromOpenApiYaml(yamlText: string): Operation[] {
  const ops: Operation[] = [];
  const lines = yamlText.split(/\r?\n/);
  let inPaths = false;
  let currentPath: string | null = null;

  for (const line of lines) {
    if (line.startsWith('paths:')) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;

    if (line.startsWith('components:')) break;

    const pathMatch = line.match(/^  (\/[^\s:]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1] ?? null;
      continue;
    }

    const methodMatch = currentPath ? line.match(/^    (get|post|put|patch|delete):\s*$/) : null;
    if (methodMatch && currentPath) {
      ops.push({ path: currentPath, method: methodMatch[1]!.toUpperCase() });
    }
  }

  return ops;
}

function concreteUrl(p: string): string {
  return p.replaceAll(/\{([^}]+)\}/g, (_m, name: string) => {
    if (name === 'order_no') return 'ORD_NOT_FOUND';
    if (name === 'return_log_id') return 'ret_not_found';
    if (name === 'scenario') return 'success';
    if (name === 'code') return 'CREDIT_CARD_SIM';
    return `test_${name}`;
  });
}

describe('OpenAPI smoke (route existence)', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let csrfToken = '';
  let openapiYamlText = '';
  let openapi: OpenApiSpec;
  let ajv: any;
  let validateErrorResponse: any;

  beforeAll(async () => {
    app = await createTestApp();
    csrfToken = (await bootstrapCsrf(app)).token;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const openapiPath = path.resolve(__dirname, '../../../specs/001-payment-flow-sim/contracts/openapi.yaml');
    openapiYamlText = await fs.readFile(openapiPath, 'utf8');
    openapi = parseYaml(openapiYamlText);

    ajv = new (Ajv as any)({
      strict: false,
      allErrors: true,
      allowUnionTypes: true,
    } as any);
    addFormats(ajv);

    const errorSchema = getResponseJsonSchema(openapi, { path: '/api/auth/login', method: 'POST', status: '401' });
    validateErrorResponse = ajv.compile(errorSchema);
  });

  afterAll(async () => {
    await app.close();
  });

  it('all documented operations are implemented (not 404)', async () => {
    const ops = parseOperationsFromOpenApiYaml(openapiYamlText);
    expect(ops.length).toBeGreaterThan(0);

    for (const op of ops) {
      const url = concreteUrl(op.path);

      const res = await app.inject({
        method: op.method as any,
        url,
        headers: {
          origin: 'http://localhost:5173',
          cookie: `${process.env.CSRF_COOKIE_NAME ?? 'csrf_token'}=${csrfToken}`,
          'x-csrf-token': csrfToken,
          'content-type': 'application/json',
        },
        payload: op.method === 'POST' || op.method === 'PUT' || op.method === 'PATCH' ? '{}' : undefined,
      });

      // 401/403/400 are acceptable for unauthenticated or invalid payload.
      expect(res.statusCode).not.toBe(404);
    }
  });

  it('error responses conform to ErrorResponse schema (best-effort)', async () => {
    const ops = parseOperationsFromOpenApiYaml(openapiYamlText);

    for (const op of ops) {
      const url = concreteUrl(op.path);
      const res = await app.inject({
        method: op.method as any,
        url,
        headers: {
          origin: 'http://localhost:5173',
          cookie: `${process.env.CSRF_COOKIE_NAME ?? 'csrf_token'}=${csrfToken}`,
          'x-csrf-token': csrfToken,
          'content-type': 'application/json',
        },
        payload: op.method === 'POST' || op.method === 'PUT' || op.method === 'PATCH' ? '{}' : undefined,
      });

      if (res.statusCode < 400) continue;
      const contentType = String(res.headers['content-type'] ?? '');
      if (!contentType.includes('application/json')) continue;

      const body = res.json() as any;
      const ok = validateErrorResponse(body);
      if (!ok) {
        // Report the first schema mismatch clearly.
        expect(validateErrorResponse.errors, `${op.method} ${op.path} ${res.statusCode}`).toBeNull();
      }
    }
  });

  it('selected 200 responses match OpenAPI schemas', async () => {
    const login = await loginAs(app, { email: 'user@example.com', password: 'user1234', csrfToken });
    const sessionCookie = login.sessionCookie;

    // GET payment methods
    {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payment-methods',
        headers: authHeaders({ csrfToken, sessionCookie }),
      });
      expect(res.statusCode).toBe(200);
      const schema = getResponseJsonSchema(openapi, { path: '/api/payment-methods', method: 'GET', status: '200' });
      const validate = ajv.compile(schema);
      const body = res.json();
      const ok = validate(body);
      if (!ok) {
        throw new Error(`schema mismatch: GET /api/payment-methods 200: ${JSON.stringify(validate.errors)}`);
      }
    }

    // POST create order
    let orderNo = '';
    {
      const res = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: {
          ...authHeaders({ csrfToken, sessionCookie }),
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          amount: 100,
          currency: 'TWD',
          callback_url: 'http://localhost:9999/callback',
          webhook_url: 'http://localhost:9999/webhook',
          payment_method_code: 'CREDIT_CARD_SIM',
          simulation_scenario: 'success',
          delay_sec: 0,
        }),
      });
      expect(res.statusCode).toBe(200);
      const schema = getResponseJsonSchema(openapi, { path: '/api/orders', method: 'POST', status: '200' });
      const validate = ajv.compile(schema);
      const body = res.json();
      const ok = validate(body);
      if (!ok) {
        throw new Error(`schema mismatch: POST /api/orders 200: ${JSON.stringify(validate.errors)}`);
      }
      orderNo = (body as any)?.order?.order_no ?? '';
      expect(orderNo).toMatch(/^ORD_/);
    }

    // GET order detail
    {
      const res = await app.inject({
        method: 'GET',
        url: `/api/orders/${orderNo}`,
        headers: authHeaders({ csrfToken, sessionCookie }),
      });
      expect(res.statusCode).toBe(200);
      const schema = getResponseJsonSchema(openapi, { path: '/api/orders/{order_no}', method: 'GET', status: '200' });
      const validate = ajv.compile(schema);
      const body = res.json();
      const ok = validate(body);
      if (!ok) {
        throw new Error(`schema mismatch: GET /api/orders/{order_no} 200: ${JSON.stringify(validate.errors)}`);
      }
    }
  });
});
