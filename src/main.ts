import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import type { Env } from './infrastructure/config/index.js';
import { configureApp, setupSwagger } from './infrastructure/http/index.js';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  app.set('trust proxy', 1);
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    setupSwagger(app);
  }
  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
