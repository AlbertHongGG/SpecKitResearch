import 'dotenv/config';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { buildApp } from './app';
import { loadConfig } from './config';

const coverageRuntimeEnabled = process.env.COVERAGE_RUNTIME === '1';

function isLocalAddress(ip: string | undefined) {
	return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

async function takeCoverageSnapshot() {
	try {
		const v8 = await import('node:v8');
		v8.takeCoverage();
	} catch {
		// Ignore environments where V8 coverage is unavailable.
	}
}

function registerCoverageShutdown(app: FastifyInstance) {
	if (!coverageRuntimeEnabled) {
		return;
	}

	app.post('/__coverage/shutdown', async (request: FastifyRequest, reply) => {
		if (!isLocalAddress(request.ip)) {
			return reply.code(403).send({ status: 'forbidden' });
		}

		reply.code(202).send({ status: 'accepted', mode: 'runtime', saved: false });

		setImmediate(async () => {
			await takeCoverageSnapshot();
			await app.close();
			process.exit(0);
		});
	});
}

async function main() {
	const config = loadConfig();
	const app = await buildApp(config);

	registerCoverageShutdown(app);
	await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
	console.log(`API listening on :${config.API_PORT}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
