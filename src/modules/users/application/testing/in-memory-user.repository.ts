import { User } from '../../domain/user.entity.js';
import { EmailAlreadyRegisteredError } from '../../domain/user.errors.js';
import type { UserRepository } from '../ports/user.repository.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly rows = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.copy(this.rows.get(id)));
  }

  findByEmail(email: string): Promise<User | null> {
    const user = [...this.rows.values()].find((row) => row.email === email);
    return Promise.resolve(this.copy(user));
  }

  create(user: User): Promise<void> {
    if ([...this.rows.values()].some((row) => row.email === user.email)) {
      return Promise.reject(new EmailAlreadyRegisteredError());
    }
    this.rows.set(user.id, user);
    return Promise.resolve();
  }

  update(user: User): Promise<void> {
    this.rows.set(user.id, user);
    return Promise.resolve();
  }

  private copy(user: User | undefined): User | null {
    return user
      ? User.restore({
          id: user.id,
          email: user.email,
          name: user.name,
          passwordHash: user.passwordHash,
          emailConfirmedAt: user.emailConfirmedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      : null;
  }
}

export class FakePasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${password}`);
  }
}
