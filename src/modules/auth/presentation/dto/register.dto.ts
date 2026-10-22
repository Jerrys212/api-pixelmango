import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimString } from './transforms.js';

export class RegisterDto {
  @ApiProperty({ example: 'ana@example.com', maxLength: 254 })
  @Transform(trimString)
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({ example: 'contraseña-segura', minLength: 8, maxLength: 128 })
  @MaxLength(128, {
    message: 'La contraseña no puede superar los 128 caracteres',
  })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsString({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiProperty({ example: 'Ana López', maxLength: 100 })
  @Transform(trimString)
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString({ message: 'El nombre es obligatorio' })
  name: string;
}
