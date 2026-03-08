import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const pkgOpenApi = path.join(root, 'openapi.yaml');
const specOpenApi = path.resolve(root, '..', '..', 'specs', '001-subscription-billing-platform', 'contracts', 'openapi.yaml');

function sha256(p) {
  const buf = readFileSync(p);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

await SwaggerParser.validate(pkgOpenApi);

const a = sha256(pkgOpenApi);
const b = sha256(specOpenApi);
if (a !== b) {
  throw new Error(
    `OpenAPI out of sync.\n- packages/contracts/openapi.yaml: ${a}\n- specs/.../openapi.yaml: ${b}\n\nSync by copying specs contract into packages/contracts.`,
  );
}

console.log('Contract OK: valid + in-sync');
