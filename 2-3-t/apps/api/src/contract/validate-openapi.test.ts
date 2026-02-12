import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { test, expect } from 'vitest';

test('OpenAPI contract (specs/...) is valid', async () => {
  const specPath = path.resolve(process.cwd(), '../../specs/001-collab-task-board/contracts/openapi.yaml');
  const api = await SwaggerParser.validate(specPath);

  if ('openapi' in api) {
    expect(api.openapi).toMatch(/^3\./);
  } else if ('swagger' in api) {
    // If this ever flips to Swagger 2.0, we still want a clear assertion.
    expect(api.swagger).toBe('2.0');
  } else {
    throw new Error('Unknown API document format (neither OpenAPI 3 nor Swagger 2)');
  }

  // A couple of high-signal smoke checks to catch accidental drift.
  expect(api.paths).toBeDefined();
  const paths = api.paths;
  expect(paths?.['/auth/register']).toBeTruthy();
  expect(paths?.['/projects/{projectId}/snapshot']).toBeTruthy();
});
