import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    example: { email: ['El correo electrónico no es válido'] },
  })
  details?: Record<string, string[]>;
}

export class ApiEnvelopeDto {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'Operación realizada correctamente' })
  message: string;

  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  data: unknown;

  @ApiProperty({ nullable: true, type: () => ApiErrorDto })
  error: ApiErrorDto | null;
}
