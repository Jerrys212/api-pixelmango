export const AUTH_TOKEN_SERVICE = Symbol('AUTH_TOKEN_SERVICE');

export interface RefreshTokenClaims {
  userId: string;
  sessionId: string;
}

export interface AuthTokenService {
  signAccessToken(userId: string): Promise<string>;
  signRefreshToken(claims: RefreshTokenClaims): Promise<string>;
  verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null>;
}
