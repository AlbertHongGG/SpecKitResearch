import { Global, Module } from '@nestjs/common'
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino'

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        redact: {
          paths: ['req.headers.authorization'],
          remove: true,
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
