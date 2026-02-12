import dotenv from 'dotenv';

import { buildApp } from './app';

async function main() {
  dotenv.config();

  const app = await buildApp();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
