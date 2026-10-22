import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';
import type { ApiResponse } from '../../shared/http/api-response.js';
import { RESPONSE_MESSAGE } from './response-message.decorator.js';
import { SKIP_ENVELOPE } from './skip-envelope.decorator.js';

const DEFAULT_MESSAGES: Record<string, string> = {
  GET: 'Consulta realizada correctamente',
  POST: 'Operación realizada correctamente',
  PUT: 'Recurso actualizado correctamente',
  PATCH: 'Recurso actualizado correctamente',
  DELETE: 'Recurso eliminado correctamente',
};

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      context.getType() !== 'http' ||
      this.reflector.getAllAndOverride<boolean | undefined>(
        SKIP_ENVELOPE,
        targets,
      )
    ) {
      return next.handle();
    }

    const { method } = context.switchToHttp().getRequest<Request>();
    const status =
      this.reflector.get<number | undefined>(
        HTTP_CODE_METADATA,
        context.getHandler(),
      ) ?? (method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK);
    const message =
      this.reflector.getAllAndOverride<string | undefined>(
        RESPONSE_MESSAGE,
        targets,
      ) ??
      DEFAULT_MESSAGES[method] ??
      'Operación realizada correctamente';

    return next.handle().pipe(
      map((data: unknown): ApiResponse<unknown> => ({
        status,
        message,
        data: data ?? null,
        error: null,
      })),
    );
  }
}
