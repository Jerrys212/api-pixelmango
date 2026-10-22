import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type {
  AuthMailInput,
  MailService,
} from '../../src/modules/auth/index.js';

export class MailServiceMock implements MailService {
  readonly sendAccountConfirmation = vi.fn<
    (input: AuthMailInput) => Promise<void>
  >(() => Promise.resolve());
  readonly sendPasswordReset = vi.fn<(input: AuthMailInput) => Promise<void>>(
    () => Promise.resolve(),
  );

  lastConfirmationTokenFor(email: string): string {
    return lastTokenFor(this.sendAccountConfirmation.mock.calls, email);
  }

  lastResetTokenFor(email: string): string {
    return lastTokenFor(this.sendPasswordReset.mock.calls, email);
  }
}

function lastTokenFor(calls: [AuthMailInput][], email: string): string {
  const call = calls.findLast(([input]) => input.to === email);
  if (!call) {
    throw new Error(`No se envió ningún correo a ${email}`);
  }
  return call[0].token;
}

export interface TestContext {
  app: INestApplication;
  mail: MailServiceMock;
  pool: Pool;
  close(): Promise<void>;
}

export async function startTestApp(): Promise<TestContext> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16',
  ).start();
  const databaseUrl = container.getConnectionUri();

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789-abcdefghij',
    JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789-abcdefghij',
    CORS_ORIGINS: 'http://localhost:3001',
    FRONTEND_CONFIRM_EMAIL_URL: 'http://localhost:3001/confirmar-cuenta',
    FRONTEND_RESET_PASSWORD_URL: 'http://localhost:3001/restablecer-contrasena',
    SMTP_HOST: 'smtp.invalid',
    SMTP_PORT: '587',
    SMTP_USER: 'test',
    SMTP_PASS: 'test',
    SMTP_EMAIL_FROM: 'Test <test@example.com>',
  });

  const pool = new Pool({ connectionString: databaseUrl });
  await migrate(drizzle({ client: pool }), { migrationsFolder: './drizzle' });

  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } =
    await import('../../src/infrastructure/http/index.js');
  const { MAIL_SERVICE } = await import('../../src/modules/auth/index.js');

  const mail = new MailServiceMock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MAIL_SERVICE)
    .useValue(mail)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error'] });
  configureApp(app);
  await app.init();

  return {
    app,
    mail,
    pool,
    async close() {
      await app.close();
      await pool.end();
      await container.stop();
    },
  };
}
