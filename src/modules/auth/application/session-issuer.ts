import { Inject, Injectable } from '@nestjs/common';
import { Session } from '../domain/session.entity.js';
import { AUTH_POLICY } from './auth-policy.js';
import {
  AUTH_TOKEN_SERVICE,
  type AuthTokenService,
} from './ports/auth-token.service.js';
import { hashToken } from './secure-token.js';

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokens: AuthTokenService,
  ) {}

  async prepare(
    userId: string,
    now: Date,
  ): Promise<{ session: Session; tokens: AuthTokens }> {
    const sessionId = globalThis.crypto.randomUUID();
    const refreshToken = await this.tokens.signRefreshToken({
      userId,
      sessionId,
    });
    const expiresAt = new Date(
      now.getTime() + AUTH_POLICY.refreshTokenTtlSeconds * 1000,
    );

    return {
      session: Session.open({
        id: sessionId,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
        now,
      }),
      tokens: {
        accessToken: await this.tokens.signAccessToken(userId),
        accessTokenExpiresIn: AUTH_POLICY.accessTokenTtlSeconds,
        refreshToken,
        refreshTokenExpiresAt: expiresAt,
      },
    };
  }
}
