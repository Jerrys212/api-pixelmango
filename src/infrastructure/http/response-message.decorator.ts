import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE = Symbol('RESPONSE_MESSAGE');

export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE, message);
