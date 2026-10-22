import { defineConfig } from 'drizzle-kit';

process.loadEnvFile();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/infrastructure/persistence/*.schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
  verbose: true,
});
