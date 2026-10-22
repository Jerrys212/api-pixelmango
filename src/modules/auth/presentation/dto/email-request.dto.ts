import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { trimString } from './transforms.js';

class EmailRequestDto {
  @ApiProperty({ example: 'ana@example.com' })
  @Transform(trimString)
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;
}

export class ResendConfirmationDto extends EmailRequestDto {}

export class ForgotPasswordDto extends EmailRequestDto {}
