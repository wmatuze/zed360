import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadApiEnvironment } from './environment';

async function bootstrap() {
  loadApiEnvironment();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.API_PORT ?? 4000);
}
void bootstrap();
