import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getEnv } from './common/config/env'
import { HttpExceptionFilter } from './common/errors/http-exception.filter'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'

const coverageRuntimeEnabled = process.env.COVERAGE_RUNTIME === '1'

function isLocalAddress(ip: string | undefined) {
  return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1'
}

async function takeCoverageSnapshot() {
  try {
    const v8 = await import('node:v8')
    v8.takeCoverage()
  } catch {
    // Ignore environments where V8 coverage is unavailable.
  }
}

async function bootstrap() {
  const env = getEnv()
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true,
  })

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: false,
    exposedHeaders: ['x-request-id'],
  })

  app.useGlobalInterceptors(new RequestIdInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())
  app.enableShutdownHooks()

  if (coverageRuntimeEnabled) {
    const server = app.getHttpAdapter().getInstance()

    server.post('/__coverage/shutdown', async (req: { ip?: string }, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
      if (!isLocalAddress(req.ip)) {
        return res.status(403).json({ status: 'forbidden' })
      }

      res.status(202).json({ status: 'accepted', mode: 'runtime', saved: false })

      setImmediate(async () => {
        await takeCoverageSnapshot()
        await app.close()
        process.exit(0)
      })
    })
  }

  await app.listen(env.PORT ?? 4000)
}
bootstrap()
