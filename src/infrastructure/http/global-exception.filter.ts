import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../shared/domain/domain-error.js';
import type { ApiError, ApiResponse } from '../../shared/http/api-response.js';
import { ERROR_STATUS } from './error-status.map.js';
import { RequestValidationException } from './request-validation.exception.js';

const HTTP_ERRORS: Partial<Record<number, { code: string; message: string }>> =
  {
    [HttpStatus.BAD_REQUEST]: {
      code: 'BAD_REQUEST',
      message: 'La solicitud no es válida',
    },
    [HttpStatus.UNAUTHORIZED]: {
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión para continuar',
    },
    [HttpStatus.FORBIDDEN]: {
      code: 'FORBIDDEN',
      message: 'No tienes permiso para realizar esta acción',
    },
    [HttpStatus.NOT_FOUND]: {
      code: 'NOT_FOUND',
      message: 'El recurso solicitado no existe',
    },
    [HttpStatus.PAYLOAD_TOO_LARGE]: {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'La solicitud es demasiado grande',
    },
    [HttpStatus.TOO_MANY_REQUESTS]: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde',
    },
  };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toResponse(exception);
    host.switchToHttp().getResponse<Response>().status(body.status).json(body);
  }

  private toResponse(exception: unknown): ApiResponse<null> {
    if (exception instanceof RequestValidationException) {
      return failure(HttpStatus.BAD_REQUEST, 'Datos de entrada inválidos', {
        code: 'VALIDATION_ERROR',
        details: exception.details,
      });
    }

    if (exception instanceof DomainError) {
      return failure(
        ERROR_STATUS[exception.code] ?? HttpStatus.UNPROCESSABLE_ENTITY,
        exception.message,
        { code: exception.code },
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const known = HTTP_ERRORS[status];
      if (known) {
        return failure(status, known.message, { code: known.code });
      }
      if (status < 500) {
        return failure(status, 'La solicitud no pudo procesarse', {
          code: 'HTTP_ERROR',
        });
      }
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return failure(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'Ocurrió un error inesperado',
      { code: 'INTERNAL_ERROR' },
    );
  }
}

function failure(
  status: number,
  message: string,
  error: ApiError,
): ApiResponse<null> {
  return { status, message, data: null, error };
}
