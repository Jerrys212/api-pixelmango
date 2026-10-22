import type { CookieOptions, Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refresh_token';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/auth',
};

export function setRefreshCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions,
    expires: expiresAt,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
}

export function readRefreshCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
}
