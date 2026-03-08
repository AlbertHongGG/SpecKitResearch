import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { AppModule } from './modules/app.module';
import { HttpExceptionFilter } from './common/errors/http-exception.filter';
import { tracingMiddleware } from './common/observability/tracing.middleware';
import { appConfig } from './common/config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(tracingMiddleware);

  app.use(
    session({
      name: appConfig.session.cookieName,
      secret: appConfig.session.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      },
    }),
  );

  app.enableCors({
    origin: appConfig.frontendOrigin,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(appConfig.port);
}

bootstrap();
