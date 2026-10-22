import type {
  UserToken,
  UserTokenType,
} from '../../domain/user-token.entity.js';

export const USER_TOKEN_REPOSITORY = Symbol('USER_TOKEN_REPOSITORY');

export interface UserTokenRepository {
  create(token: UserToken): Promise<void>;
  invalidateAllForUser(
    userId: string,
    type: UserTokenType,
    now: Date,
  ): Promise<void>;
  consume(
    tokenHash: string,
    type: UserTokenType,
    now: Date,
  ): Promise<UserToken | null>;
}
