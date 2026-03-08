import fs from 'fs';
import path from 'path';

const target = path.resolve(__dirname, '../../specs/001-subscription-billing-platform/contracts/openapi.yaml');
if (!fs.existsSync(target)) {
  console.error('openapi.yaml not found');
  process.exit(1);
}
const content = fs.readFileSync(target, 'utf8');
if (!content.includes('openapi: 3.1.0')) {
  console.error('openapi version mismatch');
  process.exit(1);
}
console.log('OpenAPI spec validation passed');
