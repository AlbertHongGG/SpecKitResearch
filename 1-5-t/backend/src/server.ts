import { config as loadEnv } from 'dotenv';
import { buildApp } from './app.js';

// Load backend/.env regardless of current working directory.
loadEnv({ path: new URL('../.env', import.meta.url) });

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  app.log.info({ port: PORT }, 'Server listening');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
