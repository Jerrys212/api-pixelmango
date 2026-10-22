import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../../infrastructure/config/index.js';
import type { AccessTokenPayload } from '../../../../infrastructure/http/auth/index.js';
import { AUTH_POLICY } from '../../application/auth-policy.js';
import type {
  AuthTokenService,
  RefreshTokenClaims,
} from '../../application/ports/auth-token.service.js';

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  typ: 'refresh';
}

@Injectable()
export class JwtAuthTokenService implements AuthTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  signAccessToken(userId: string): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, typ: 'access' };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: AUTH_POLICY.accessTokenTtlSeconds,
      algorithm: 'HS256',
    });
  }

  signRefreshToken({ userId, sessionId }: RefreshTokenClaims): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      typ: 'refresh',
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: AUTH_POLICY.refreshTokenTtlSeconds,
      algorithm: 'HS256',
    });
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
        algorithms: ['HS256'],
      });
      if (payload.typ !== 'refresh' || !payload.sub || !payload.sid) {
        return null;
      }
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }
}
