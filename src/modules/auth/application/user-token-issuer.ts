import { Inject, Injectable } from '@nestjs/common';
import { UserToken, type UserTokenType } from '../domain/user-token.entity.js';
import { AUTH_POLICY } from './auth-policy.js';
import {
  USER_TOKEN_REPOSITORY,
  type UserTokenRepository,
} from './ports/user-token.repository.js';
import { generateSecureToken, hashToken } from './secure-token.js';

@Injectable()
export class UserTokenIssuer {
  constructor(
    @Inject(USER_TOKEN_REPOSITORY)
    private readonly userTokens: UserTokenRepository,
  ) {}

  async issue(userId: string, type: UserTokenType, now: Date): Promise<string> {
    await this.userTokens.invalidateAllForUser(userId, type, now);

    const token = generateSecureToken();
    await this.userTokens.create(
      UserToken.issue({
        userId,
        type,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + AUTH_POLICY.userTokenTtlMs[type]),
        now,
      }),
    );
    return token;
  }
}
