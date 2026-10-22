import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimString } from './transforms.js';

export class LoginDto {
  @ApiProperty({ example: 'ana@example.com' })
  @Transform(trimString)
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({ example: 'contraseña-segura' })
  @MaxLength(128, {
    message: 'La contraseña no puede superar los 128 caracteres',
  })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString({ message: 'La contraseña es obligatoria' })
  password: string;
}
