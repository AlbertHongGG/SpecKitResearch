import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './common/config/env';
import { AllExceptionsFilter } from './common/errors/http-exception.filter';
import { requestIdMiddleware } from './common/request/request-id.middleware';

async function bootstrap() {
  // Validate environment at boot (throws on misconfig)
  void env;

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.use(requestIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
