import { EmailAlreadyRegisteredError } from '../domain/user.errors.js';
import {
  FakePasswordHasher,
  InMemoryUserRepository,
} from './testing/in-memory-user.repository.js';
import { UsersFacade } from './users.facade.js';

describe('UsersFacade', () => {
  let facade: UsersFacade;

  beforeEach(() => {
    facade = new UsersFacade(
      new InMemoryUserRepository(),
      new FakePasswordHasher(),
    );
  });

  it('registers a user with a normalized email and no password in the result', async () => {
    const account = await facade.register({
      email: ' Ana@Example.com ',
      name: 'Ana',
      password: 'secret-123',
    });

    expect(account).toEqual({
      id: expect.any(String),
      email: 'ana@example.com',
      name: 'Ana',
      isEmailConfirmed: false,
      createdAt: expect.any(Date),
    });
    expect(account).not.toHaveProperty('passwordHash');
  });

  it('rejects an email that differs only in case or spaces', async () => {
    await facade.register({
      email: 'ana@example.com',
      name: 'Ana',
      password: 'secret-123',
    });

    await expect(
      facade.register({
        email: '  ANA@example.com',
        name: 'Otra',
        password: 'secret-456',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('verifies credentials and returns null for wrong password or unknown email', async () => {
    await facade.register({
      email: 'ana@example.com',
      name: 'Ana',
      password: 'secret-123',
    });

    await expect(
      facade.verifyCredentials('ANA@example.com', 'secret-123'),
    ).resolves.toMatchObject({ email: 'ana@example.com' });
    await expect(
      facade.verifyCredentials('ana@example.com', 'wrong-pass'),
    ).resolves.toBeNull();
    await expect(
      facade.verifyCredentials('nadie@example.com', 'secret-123'),
    ).resolves.toBeNull();
  });

  it('changes the password', async () => {
    const account = await facade.register({
      email: 'ana@example.com',
      name: 'Ana',
      password: 'secret-123',
    });

    await facade.changePassword(account.id, 'new-secret-456');

    await expect(
      facade.verifyCredentials('ana@example.com', 'secret-123'),
    ).resolves.toBeNull();
    await expect(
      facade.verifyCredentials('ana@example.com', 'new-secret-456'),
    ).resolves.not.toBeNull();
  });
});
