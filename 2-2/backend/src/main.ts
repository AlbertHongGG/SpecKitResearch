import 'dotenv/config'

import { NestFactory } from '@nestjs/core'

import { env } from './common/config/env'
import { HttpExceptionFilter } from './common/http/http-exception.filter'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
  })
  app.useGlobalFilters(new HttpExceptionFilter())
  await app.listen(env.PORT)
}
bootstrap()
