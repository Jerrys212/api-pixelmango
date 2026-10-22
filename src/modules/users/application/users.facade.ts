import { Inject, Injectable } from '@nestjs/common';
import { normalizeEmail } from '../domain/email.js';
import { User } from '../domain/user.entity.js';
import {
  EmailAlreadyRegisteredError,
  UserNotFoundError,
} from '../domain/user.errors.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from './ports/password-hasher.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from './ports/user.repository.js';
import { toUserAccount, type UserAccount } from './user-account.js';

@Injectable()
export class UsersFacade {
  private dummyHash?: Promise<string>;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<UserAccount> {
    const email = normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const user = User.register({
      email,
      name: input.name,
      passwordHash: await this.hasher.hash(input.password),
      now: new Date(),
    });
    await this.users.create(user);
    return toUserAccount(user);
  }

  async findByEmail(email: string): Promise<UserAccount | null> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    return user ? toUserAccount(user) : null;
  }

  async findById(id: string): Promise<UserAccount | null> {
    const user = await this.users.findById(id);
    return user ? toUserAccount(user) : null;
  }

  async verifyCredentials(
    email: string,
    password: string,
  ): Promise<UserAccount | null> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user) {
      // Hash anyway so response time does not reveal whether the email exists.
      await this.hasher.verify(await this.getDummyHash(), password);
      return null;
    }
    const matches = await this.hasher.verify(user.passwordHash, password);
    return matches ? toUserAccount(user) : null;
  }

  async confirmEmail(userId: string): Promise<void> {
    const user = await this.getExisting(userId);
    if (user.isEmailConfirmed) {
      return;
    }
    user.confirmEmail(new Date());
    await this.users.update(user);
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.getExisting(userId);
    user.changePassword(await this.hasher.hash(newPassword), new Date());
    await this.users.update(user);
  }

  private async getExisting(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(globalThis.crypto.randomUUID());
    return this.dummyHash;
  }
}
