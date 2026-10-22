import { ApiProperty } from '@nestjs/swagger';
import type { UserAccount } from '../../application/user-account.js';

export class UserProfileResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ana@example.com' })
  email: string;

  @ApiProperty({ example: 'Ana López' })
  name: string;

  @ApiProperty({ example: true })
  emailConfirmed: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  static from(account: UserAccount): UserProfileResponseDto {
    return Object.assign(new UserProfileResponseDto(), {
      id: account.id,
      email: account.email,
      name: account.name,
      emailConfirmed: account.isEmailConfirmed,
      createdAt: account.createdAt.toISOString(),
    });
  }
}
