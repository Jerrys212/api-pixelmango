import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({ description: 'Token recibido en el enlace del correo' })
  @MaxLength(256, { message: 'El token no es válido' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsString({ message: 'El token es obligatorio' })
  token: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido en el enlace del correo' })
  @MaxLength(256, { message: 'El token no es válido' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsString({ message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({ example: 'nueva-contraseña', minLength: 8, maxLength: 128 })
  @MaxLength(128, {
    message: 'La contraseña no puede superar los 128 caracteres',
  })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsString({ message: 'La contraseña es obligatoria' })
  password: string;
}
