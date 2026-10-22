import type { App } from 'supertest/types.js';
import request, { type Response } from 'supertest';
import { startTestApp, type TestContext } from './support/test-app.js';

const PASSWORD = 'contraseña-segura';

let ctx: TestContext;
let server: App;
let sequence = 0;

beforeAll(async () => {
  ctx = await startTestApp();
  server = ctx.app.getHttpServer() as App;
});

afterAll(async () => {
  await ctx?.close();
});

function uniqueEmail(): string {
  sequence += 1;
  return `usuario${sequence}.${Date.now()}@example.com`;
}

function refreshCookieOf(response: Response): string {
  const header = response.headers['set-cookie'] as unknown as
    string[] | undefined;
  const cookie = header?.find((value) => value.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('La respuesta no trae la cookie refresh_token');
  }
  return cookie;
}

function cookiePair(setCookie: string): string {
  return setCookie.split(';')[0]!;
}

function register(email: string, password = PASSWORD) {
  return request(server)
    .post('/auth/register')
    .send({ email, password, name: 'Ana López' });
}

async function registerConfirmed(email: string, password = PASSWORD) {
  await register(email, password).expect(201);
  await request(server)
    .post('/auth/confirm')
    .send({ token: ctx.mail.lastConfirmationTokenFor(email) })
    .expect(200);
}

function login(email: string, password = PASSWORD) {
  return request(server).post('/auth/login').send({ email, password });
}

function refresh(cookie: string) {
  return request(server)
    .post('/auth/refresh')
    .set('Cookie', cookiePair(cookie));
}

describe('Auth (e2e)', () => {
  describe('POST /auth/register', () => {
    it('creates an unconfirmed user, sends the email and never returns the password', async () => {
      const email = uniqueEmail();

      const response = await register(`  ${email.toUpperCase()} `).expect(201);

      expect(response.body).toEqual({
        status: 201,
        message: expect.any(String),
        data: {
          id: expect.any(String),
          email,
          name: 'Ana López',
          emailConfirmed: false,
        },
        error: null,
      });
      expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);
      expect(ctx.mail.sendAccountConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ to: email, token: expect.any(String) }),
      );

      const { rows } = await ctx.pool.query<{ password_hash: string }>(
        'select password_hash from users where email = $1',
        [email],
      );
      expect(rows[0]!.password_hash).toMatch(/^\$argon2id\$/);
    });

    it('rejects a duplicated email regardless of case', async () => {
      const email = uniqueEmail();
      await register(email).expect(201);

      const response = await register(email.toUpperCase()).expect(409);

      expect(response.body).toMatchObject({
        status: 409,
        data: null,
        error: { code: 'EMAIL_ALREADY_REGISTERED' },
      });
    });

    it('validates the payload', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({ email: 'no-es-correo', password: 'corta', extra: true })
        .expect(400);

      expect(response.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        details: {
          email: ['El correo electrónico no es válido'],
          password: ['La contraseña debe tener al menos 8 caracteres'],
          name: ['El nombre es obligatorio'],
          extra: ['Este campo no está permitido'],
        },
      });
    });

    it('still registers the user when the email provider fails', async () => {
      const email = uniqueEmail();
      ctx.mail.sendAccountConfirmation.mockRejectedValueOnce(
        new Error('SMTP caído'),
      );

      await register(email).expect(201);
      await request(server)
        .post('/auth/resend-confirmation')
        .send({ email })
        .expect(200);

      await request(server)
        .post('/auth/confirm')
        .send({ token: ctx.mail.lastConfirmationTokenFor(email) })
        .expect(200);
    });
  });

  describe('account confirmation', () => {
    it('confirms with a valid token, only once', async () => {
      const email = uniqueEmail();
      await register(email).expect(201);
      const token = ctx.mail.lastConfirmationTokenFor(email);

      await request(server).post('/auth/confirm').send({ token }).expect(200);
      const reused = await request(server)
        .post('/auth/confirm')
        .send({ token })
        .expect(400);

      expect(reused.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
      const { rows } = await ctx.pool.query<{ token_hash: string }>(
        'select token_hash from auth_user_tokens',
      );
      expect(rows.map((row) => row.token_hash)).not.toContain(token);
    });

    it('rejects expired tokens', async () => {
      const email = uniqueEmail();
      await register(email).expect(201);
      await ctx.pool.query(
        `update auth_user_tokens set expires_at = now() - interval '1 second'
         where user_id = (select id from users where email = $1)`,
        [email],
      );

      await request(server)
        .post('/auth/confirm')
        .send({ token: ctx.mail.lastConfirmationTokenFor(email) })
        .expect(400);
    });

    it('resend invalidates previous tokens and answers generically', async () => {
      const email = uniqueEmail();
      await register(email).expect(201);
      const first = ctx.mail.lastConfirmationTokenFor(email);

      const known = await request(server)
        .post('/auth/resend-confirmation')
        .send({ email })
        .expect(200);
      const unknown = await request(server)
        .post('/auth/resend-confirmation')
        .send({ email: uniqueEmail() })
        .expect(200);

      expect(unknown.body).toEqual(known.body);
      await request(server)
        .post('/auth/confirm')
        .send({ token: first })
        .expect(400);
      await request(server)
        .post('/auth/confirm')
        .send({ token: ctx.mail.lastConfirmationTokenFor(email) })
        .expect(200);
    });
  });

  describe('POST /auth/login', () => {
    it('rejects users that have not confirmed their email', async () => {
      const email = uniqueEmail();
      await register(email).expect(201);

      const response = await login(email).expect(403);

      expect(response.body.error.code).toBe('EMAIL_NOT_CONFIRMED');
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('answers the same for a wrong password and an unknown email', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);

      const wrongPassword = await login(email, 'otra-contraseña').expect(401);
      const unknownEmail = await login(uniqueEmail()).expect(401);

      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(wrongPassword.body).toMatchObject({
        message: 'Credenciales inválidas',
        error: { code: 'INVALID_CREDENTIALS' },
      });
    });

    it('returns the access token in the body and the refresh token in a secure cookie', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);

      const response = await login(email).expect(200);

      expect(response.body.data).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      const cookie = refreshCookieOf(response);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Secure/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\/auth/);
    });
  });

  describe('GET /users/me', () => {
    it('returns the profile without sensitive fields', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const { body } = await login(email).expect(200);

      const response = await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${body.data.accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        id: expect.any(String),
        email,
        name: 'Ana López',
        emailConfirmed: true,
        createdAt: expect.any(String),
      });
    });

    it('requires a valid access token', async () => {
      await request(server).get('/users/me').expect(401);
      await request(server)
        .get('/users/me')
        .set('Authorization', 'Bearer no-es-un-jwt')
        .expect(401);
    });

    it('does not accept a refresh token as access token', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const cookie = refreshCookieOf(await login(email).expect(200));
      const refreshToken = cookiePair(cookie).split('=')[1]!;

      await request(server)
        .get('/users/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token on every use', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const first = refreshCookieOf(await login(email).expect(200));

      const response = await refresh(first).expect(200);
      const second = refreshCookieOf(response);

      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(cookiePair(second)).not.toBe(cookiePair(first));
      await refresh(second).expect(200);
    });

    it('revokes every session of the user when a rotated token is reused', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const laptop = refreshCookieOf(await login(email).expect(200));
      const phone = refreshCookieOf(await login(email).expect(200));
      const rotated = refreshCookieOf(await refresh(laptop).expect(200));

      const reuse = await refresh(laptop).expect(401);

      expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');
      expect(refreshCookieOf(reuse)).toMatch(/refresh_token=;/);
      await refresh(rotated).expect(401);
      await refresh(phone).expect(401);
    });

    it('rejects a missing or forged cookie', async () => {
      const missing = await request(server).post('/auth/refresh').expect(401);
      expect(missing.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      await refresh('refresh_token=falso').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the current session', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const cookie = refreshCookieOf(await login(email).expect(200));

      await request(server)
        .post('/auth/logout')
        .set('Cookie', cookiePair(cookie))
        .expect(200);

      await refresh(cookie).expect(401);
    });
  });

  describe('password recovery', () => {
    it('answers generically whether or not the email exists', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);

      const known = await request(server)
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);
      const unknown = await request(server)
        .post('/auth/forgot-password')
        .send({ email: uniqueEmail() })
        .expect(200);

      expect(unknown.body).toEqual(known.body);
    });

    it('resets the password, revokes all sessions and burns the token', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);
      const laptop = refreshCookieOf(await login(email).expect(200));
      const phone = refreshCookieOf(await login(email).expect(200));

      await request(server)
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);
      const token = ctx.mail.lastResetTokenFor(email);

      await request(server)
        .post('/auth/reset-password')
        .send({ token, password: 'nueva-contraseña-1' })
        .expect(200);

      await refresh(laptop).expect(401);
      await refresh(phone).expect(401);
      await login(email).expect(401);
      await login(email, 'nueva-contraseña-1').expect(200);

      const reused = await request(server)
        .post('/auth/reset-password')
        .send({ token, password: 'otra-contraseña-2' })
        .expect(400);
      expect(reused.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('a new request invalidates the previous reset link', async () => {
      const email = uniqueEmail();
      await registerConfirmed(email);

      await request(server).post('/auth/forgot-password').send({ email });
      const first = ctx.mail.lastResetTokenFor(email);
      await request(server).post('/auth/forgot-password').send({ email });

      await request(server)
        .post('/auth/reset-password')
        .send({ token: first, password: 'nueva-contraseña-1' })
        .expect(400);
      await request(server)
        .post('/auth/reset-password')
        .send({
          token: ctx.mail.lastResetTokenFor(email),
          password: 'nueva-contraseña-1',
        })
        .expect(200);
    });
  });

  it('GET /health is public and not enveloped', async () => {
    await request(server).get('/health').expect(200, { status: 'ok' });
  });
});
