import 'reflect-metadata';
import { AppDataSource } from './config/database';
import { initKeys } from './config/keys';
import { env } from './config/env';
import { createApp } from './app/app';

async function bootstrap() {
  console.log('Initializing RSA key pair...');
  await initKeys();

  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Porichoy API running on http://localhost:${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);
    console.log(`  OTP dev mode: ${env.otp.devMode} (value: ${env.otp.devValue})`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
