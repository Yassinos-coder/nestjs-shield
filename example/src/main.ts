import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Optionally, instead of (or in addition to) the global guard registered by
  // ShieldModule.forRoot, you can attach the same engine as an Express
  // middleware so rejected traffic is dropped *before* NestJS guards run:
  //
  //   import { Shield } from 'nestjs-shield';
  //   Shield.applyTo(app, { rateLimit: { limit: 60, ttl: 60_000 } });

  await app.listen(3000);
  console.log('nestjs-shield example listening on http://localhost:3000');
}

bootstrap();
