import { ApiProperty } from '@nestjs/swagger';
import type { AccountSummary } from '../../application/ports/user-accounts.js';
import type { AuthTokens } from '../../application/session-issuer.js';

export class RegisteredUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;

  @ApiProperty({ example: 'Ana López' })
  name: string;

  @ApiProperty({ example: false })
  emailConfirmed: boolean;

  static from(account: AccountSummary): RegisteredUserResponseDto {
    return Object.assign(new RegisteredUserResponseDto(), {
      id: account.id,
      email: account.email,
      name: account.name,
      emailConfirmed: account.isEmailConfirmed,
    });
  }
}

export class AccessTokenResponseDto {
  @ApiProperty({ description: 'JWT de acceso para la cabecera Authorization' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 900, description: 'Segundos hasta que caduca' })
  expiresIn: number;

  static from(tokens: AuthTokens): AccessTokenResponseDto {
    return Object.assign(new AccessTokenResponseDto(), {
      accessToken: tokens.accessToken,
      tokenType: 'Bearer',
      expiresIn: tokens.accessTokenExpiresIn,
    });
  }
}
