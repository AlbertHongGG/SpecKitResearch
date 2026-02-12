import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'
import { AppModule } from './app.module'
import { AppConfigService } from './common/config/app-config.service'
import { HttpExceptionFilter } from './common/http/http-exception.filter'
import { requestIdMiddleware } from './common/logging/request-id.middleware'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  const config = app.get(AppConfigService)

  process.env.TZ ??= config.tz

  app.use(requestIdMiddleware)
  app.useLogger(app.get(Logger))

  app.enableCors({
    origin: config.corsOrigin,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(config.port)
}
bootstrap();
