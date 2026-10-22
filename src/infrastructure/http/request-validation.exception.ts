import { BadRequestException, type ValidationError } from '@nestjs/common';

export class RequestValidationException extends BadRequestException {
  constructor(readonly details: Record<string, string[]>) {
    super('VALIDATION_ERROR');
  }

  static fromValidationErrors(
    errors: ValidationError[],
  ): RequestValidationException {
    return new RequestValidationException(collectMessages(errors));
  }
}

function collectMessages(
  errors: ValidationError[],
  parentPath = '',
  details: Record<string, string[]> = {},
): Record<string, string[]> {
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    if (error.constraints) {
      details[path] = Object.entries(error.constraints).map(([rule, text]) =>
        rule === 'whitelistValidation' ? 'Este campo no está permitido' : text,
      );
    }
    if (error.children?.length) {
      collectMessages(error.children, path, details);
    }
  }
  return details;
}
