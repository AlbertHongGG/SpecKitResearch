import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const openApiPath = path.resolve(root, '..', 'specs', '001-jira-lite-rbac', 'contracts', 'openapi.yaml');

const source = readFileSync(openApiPath, 'utf8');

const checks = [
  ['OpenAPI version', /^openapi:\s*3\.1\.0$/m],
  ['API title', /^\s{2}title:\s+Jira Lite API$/m],
  ['Auth login path', /^\s{2}\/auth\/login:$/m],
  ['Project issue list path', /^\s{2}\/projects\/\{projectId\}\/issues:$/m],
  ['Project archive path', /^\s{2}\/projects\/\{projectId\}\/archive:$/m],
  ['Org audit path', /^\s{2}\/orgs\/\{orgId\}\/audit:$/m],
  ['Platform audit path', /^\s{2}\/platform\/audit:$/m],
  ['Issue schema', /^\s{4}Issue:$/m],
  ['Error response schema', /^\s{4}ErrorResponse:$/m],
  ['Cookie security scheme', /^\s{4}cookieSession:$/m],
];

const missing = checks.filter(([, pattern]) => !pattern.test(source)).map(([label]) => label);

if (missing.length > 0) {
  console.error('OpenAPI validation failed. Missing required sections:');
  for (const label of missing) {
    console.error(`- ${label}`);
  }
  process.exit(1);
}

console.log(`OpenAPI validation passed for ${openApiPath}`);