import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { getEnv } from './common/config/env'
import { HttpExceptionFilter } from './common/errors/http-exception.filter'
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor'

async function bootstrap() {
  const env = getEnv()
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: true,
    credentials: false,
    exposedHeaders: ['x-request-id'],
  })

  app.useGlobalInterceptors(new RequestIdInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(env.PORT ?? 3000)
}
bootstrap()
