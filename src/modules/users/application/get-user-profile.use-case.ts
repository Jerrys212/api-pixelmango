import { Inject, Injectable } from '@nestjs/common';
import { UserNotFoundError } from '../domain/user.errors.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './ports/user.repository.js';
import { toUserAccount, type UserAccount } from './user-account.js';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(input: { userId: string }): Promise<UserAccount> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return toUserAccount(user);
  }
}
