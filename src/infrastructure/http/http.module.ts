import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { HealthController } from './health.controller.js';
import { RequestValidationException } from './request-validation.exception.js';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor.js';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
        exceptionFactory: (errors) =>
          RequestValidationException.fromValidationErrors(errors),
      }),
    },
  ],
})
export class HttpModule {}
