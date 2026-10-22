import { User } from './user.entity.js';

describe('User', () => {
  const now = new Date('2026-01-01T00:00:00Z');

  it('normalizes the email and starts unconfirmed on register', () => {
    const user = User.register({
      email: '  Ana.Lopez@Example.COM ',
      name: ' Ana ',
      passwordHash: 'hash',
      now,
    });

    expect(user.email).toBe('ana.lopez@example.com');
    expect(user.name).toBe('Ana');
    expect(user.isEmailConfirmed).toBe(false);
  });

  it('keeps the first confirmation date when confirmed twice', () => {
    const user = User.register({
      email: 'ana@example.com',
      name: 'Ana',
      passwordHash: 'hash',
      now,
    });
    const later = new Date('2026-01-02T00:00:00Z');

    user.confirmEmail(now);
    user.confirmEmail(later);

    expect(user.emailConfirmedAt).toEqual(now);
  });
});
