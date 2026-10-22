import type { Session } from '../../domain/session.entity.js';

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');

export interface SessionRepository {
  create(session: Session): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  rotate(
    currentTokenHash: string,
    replacement: Session,
    now: Date,
  ): Promise<boolean>;
  revoke(tokenHash: string, now: Date): Promise<void>;
  revokeAllForUser(userId: string, now: Date): Promise<void>;
}
