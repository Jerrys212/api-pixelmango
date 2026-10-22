import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { SEED_PASSWORD, seedUsers } from './users.seed.js';

process.loadEnvFile();

if (process.env.NODE_ENV === 'production') {
  throw new Error('El seeder no puede ejecutarse con NODE_ENV=production');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Falta DATABASE_URL en el .env');
}

const pool = new Pool({ connectionString: databaseUrl });

try {
  const created = await seedUsers(drizzle({ client: pool }));
  console.log(
    `Usuarios creados: ${created} (los que ya existían se omitieron). Contraseña: ${SEED_PASSWORD}`,
  );
} finally {
  await pool.end();
}
