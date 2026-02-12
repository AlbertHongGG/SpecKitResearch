import 'dotenv/config';

import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const app = await buildApp(config);

await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
// eslint-disable-next-line no-console
console.log(`API listening on :${config.API_PORT}`);
