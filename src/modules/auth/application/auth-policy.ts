import type { UserTokenType } from '../domain/user-token.entity.js';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const AUTH_POLICY = {
  accessTokenTtlSeconds: (15 * MINUTE_MS) / 1000,
  refreshTokenTtlSeconds: (7 * DAY_MS) / 1000,
  userTokenTtlMs: {
    email_confirmation: DAY_MS,
    password_reset: HOUR_MS,
  } satisfies Record<UserTokenType, number>,
} as const;
