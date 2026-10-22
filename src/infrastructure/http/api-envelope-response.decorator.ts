import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiEnvelopeDto, ApiErrorDto } from './api-envelope.dto.js';

interface EnvelopeResponseOptions {
  status: number;
  description?: string;
}

export function ApiEnvelopeResponse(
  model: Type<unknown> | null,
  { status, description }: EnvelopeResponseOptions,
) {
  return applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, ...(model ? [model] : [])),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              status: { type: 'number', example: status },
              data: model
                ? { $ref: getSchemaPath(model) }
                : { type: 'object', nullable: true, example: null },
              error: { type: 'object', nullable: true, example: null },
            },
          },
        ],
      },
    }),
  );
}

export function ApiEnvelopeErrorResponse(
  status: number,
  codes: string[],
  description?: string,
) {
  return applyDecorators(
    ApiExtraModels(ApiEnvelopeDto, ApiErrorDto),
    ApiResponse({
      status,
      description: description ?? codes.join(' | '),
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiEnvelopeDto) },
          {
            properties: {
              status: { type: 'number', example: status },
              data: { type: 'object', nullable: true, example: null },
              error: {
                allOf: [
                  { $ref: getSchemaPath(ApiErrorDto) },
                  {
                    properties: {
                      code: { type: 'string', enum: codes, example: codes[0] },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }),
  );
}
