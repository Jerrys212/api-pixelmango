import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from './ports/session.repository.js';
import { hashToken } from './secure-token.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute(input: { refreshToken: string | null }): Promise<void> {
    if (!input.refreshToken) {
      return;
    }
    await this.sessions.revoke(hashToken(input.refreshToken), new Date());
  }
}
