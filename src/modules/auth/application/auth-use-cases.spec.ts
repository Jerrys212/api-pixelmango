import {
  EmailNotConfirmedError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  InvalidTokenError,
  RefreshTokenReusedError,
} from '../domain/auth.errors.js';
import { ConfirmEmailUseCase } from './confirm-email.use-case.js';
import { ForgotPasswordUseCase } from './forgot-password.use-case.js';
import { LoginUseCase } from './login.use-case.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import { RegisterUseCase } from './register.use-case.js';
import { ResendConfirmationUseCase } from './resend-confirmation.use-case.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import { SessionIssuer } from './session-issuer.js';
import {
  FakeAuthTokenService,
  InMemorySessionRepository,
  InMemoryUserAccounts,
  InMemoryUserTokenRepository,
  PassthroughTransactionRunner,
  RecordingMailService,
} from './testing/auth-test-doubles.js';
import { UserTokenIssuer } from './user-token-issuer.js';

function setup() {
  const users = new InMemoryUserAccounts();
  const sessions = new InMemorySessionRepository();
  const userTokens = new InMemoryUserTokenRepository();
  const tokens = new FakeAuthTokenService();
  const mail = new RecordingMailService();
  const transaction = new PassthroughTransactionRunner();
  const tokenIssuer = new UserTokenIssuer(userTokens);
  const sessionIssuer = new SessionIssuer(tokens);

  return {
    users,
    sessions,
    userTokens,
    mail,
    register: new RegisterUseCase(users, mail, transaction, tokenIssuer),
    confirm: new ConfirmEmailUseCase(users, userTokens, transaction),
    resend: new ResendConfirmationUseCase(
      users,
      mail,
      transaction,
      tokenIssuer,
    ),
    login: new LoginUseCase(users, sessions, sessionIssuer),
    refresh: new RefreshSessionUseCase(
      tokens,
      sessions,
      transaction,
      sessionIssuer,
    ),
    forgot: new ForgotPasswordUseCase(users, mail, transaction, tokenIssuer),
    reset: new ResetPasswordUseCase(users, userTokens, sessions, transaction),
  };
}

type Ctx = ReturnType<typeof setup>;

async function registerConfirmed(ctx: Ctx, email = 'ana@example.com') {
  const account = await ctx.register.execute({
    email,
    name: 'Ana',
    password: 'secret-123',
  });
  await ctx.confirm.execute({ token: ctx.mail.confirmations.at(-1)!.token });
  return account;
}

describe('auth use cases', () => {
  let ctx: Ctx;

  beforeEach(() => {
    ctx = setup();
  });

  describe('register and confirm', () => {
    it('stores only the hash of the confirmation token', async () => {
      await ctx.register.execute({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'secret-123',
      });

      const sent = ctx.mail.confirmations[0]!.token;
      const [stored] = [...ctx.userTokens.rows.values()];
      expect(stored!.tokenHash).not.toBe(sent);
      expect(stored!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('still registers the user when the email fails to send', async () => {
      ctx.mail.failNext = true;

      const account = await ctx.register.execute({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'secret-123',
      });

      expect(account.isEmailConfirmed).toBe(false);
      await ctx.resend.execute({ email: 'ana@example.com' });
      expect(ctx.mail.confirmations).toHaveLength(1);
    });

    it('confirmation tokens are single use', async () => {
      await ctx.register.execute({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'secret-123',
      });
      const token = ctx.mail.confirmations[0]!.token;

      await ctx.confirm.execute({ token });

      await expect(ctx.confirm.execute({ token })).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
    });

    it('confirmation tokens expire after 24 hours', async () => {
      vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      try {
        await ctx.register.execute({
          email: 'ana@example.com',
          name: 'Ana',
          password: 'secret-123',
        });
        vi.setSystemTime(new Date('2026-01-02T00:00:01Z'));

        await expect(
          ctx.confirm.execute({ token: ctx.mail.confirmations[0]!.token }),
        ).rejects.toBeInstanceOf(InvalidTokenError);
      } finally {
        vi.useRealTimers();
      }
    });

    it('resending invalidates the previous confirmation token', async () => {
      await ctx.register.execute({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'secret-123',
      });
      const first = ctx.mail.confirmations[0]!.token;

      await ctx.resend.execute({ email: 'ANA@example.com' });
      const second = ctx.mail.confirmations[1]!.token;

      await expect(
        ctx.confirm.execute({ token: first }),
      ).rejects.toBeInstanceOf(InvalidTokenError);
      await expect(
        ctx.confirm.execute({ token: second }),
      ).resolves.toBeUndefined();
    });

    it('resend does nothing for unknown or already confirmed emails', async () => {
      await registerConfirmed(ctx);
      const sentBefore = ctx.mail.confirmations.length;

      await ctx.resend.execute({ email: 'nadie@example.com' });
      await ctx.resend.execute({ email: 'ana@example.com' });

      expect(ctx.mail.confirmations).toHaveLength(sentBefore);
    });
  });

  describe('login', () => {
    it('rejects users that have not confirmed their email', async () => {
      await ctx.register.execute({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'secret-123',
      });

      await expect(
        ctx.login.execute({ email: 'ana@example.com', password: 'secret-123' }),
      ).rejects.toBeInstanceOf(EmailNotConfirmedError);
    });

    it('uses the same error for unknown email and wrong password', async () => {
      await registerConfirmed(ctx);

      await expect(
        ctx.login.execute({ email: 'ana@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      await expect(
        ctx.login.execute({ email: 'nadie@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('opens a session with a hashed refresh token', async () => {
      const account = await registerConfirmed(ctx);

      const tokens = await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });

      const [session] = ctx.sessions.activeFor(account.id);
      expect(tokens.accessTokenExpiresIn).toBe(900);
      expect(session!.tokenHash).not.toBe(tokens.refreshToken);
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token', async () => {
      const account = await registerConfirmed(ctx);
      const first = await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });

      const second = await ctx.refresh.execute({
        refreshToken: first.refreshToken,
      });

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(ctx.sessions.activeFor(account.id)).toHaveLength(1);
    });

    it('revokes every session when a rotated token is reused', async () => {
      const account = await registerConfirmed(ctx);
      const laptop = await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });
      await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });
      await ctx.refresh.execute({ refreshToken: laptop.refreshToken });

      await expect(
        ctx.refresh.execute({ refreshToken: laptop.refreshToken }),
      ).rejects.toBeInstanceOf(RefreshTokenReusedError);
      expect(ctx.sessions.activeFor(account.id)).toHaveLength(0);
    });

    it('rejects unknown refresh tokens without revoking anything', async () => {
      const account = await registerConfirmed(ctx);
      await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });

      await expect(
        ctx.refresh.execute({ refreshToken: `refresh.${account.id}.nope` }),
      ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
      await expect(
        ctx.refresh.execute({ refreshToken: 'garbage' }),
      ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
      expect(ctx.sessions.activeFor(account.id)).toHaveLength(1);
    });
  });

  describe('password recovery', () => {
    it('changes the password and revokes all sessions', async () => {
      const account = await registerConfirmed(ctx);
      await ctx.login.execute({
        email: 'ana@example.com',
        password: 'secret-123',
      });
      await ctx.forgot.execute({ email: 'ana@example.com' });

      await ctx.reset.execute({
        token: ctx.mail.resets[0]!.token,
        password: 'new-secret-456',
      });

      expect(ctx.sessions.activeFor(account.id)).toHaveLength(0);
      await expect(
        ctx.login.execute({ email: 'ana@example.com', password: 'secret-123' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      await expect(
        ctx.login.execute({
          email: 'ana@example.com',
          password: 'new-secret-456',
        }),
      ).resolves.toBeDefined();
    });

    it('reset tokens expire after 1 hour and a new request invalidates the old one', async () => {
      vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
      try {
        await registerConfirmed(ctx);
        await ctx.forgot.execute({ email: 'ana@example.com' });
        await ctx.forgot.execute({ email: 'ana@example.com' });
        const [first, second] = ctx.mail.resets;

        await expect(
          ctx.reset.execute({ token: first!.token, password: 'whatever-1' }),
        ).rejects.toBeInstanceOf(InvalidTokenError);

        vi.setSystemTime(new Date('2026-01-01T01:00:01Z'));
        await expect(
          ctx.reset.execute({ token: second!.token, password: 'whatever-2' }),
        ).rejects.toBeInstanceOf(InvalidTokenError);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not send anything for unknown emails', async () => {
      await ctx.forgot.execute({ email: 'nadie@example.com' });
      expect(ctx.mail.resets).toHaveLength(0);
    });
  });
});
