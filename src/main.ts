import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APPLICATION, PORT, VERSION } from './config/env';
import { configureHttp } from './infra/http/configure-http';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureHttp(app);
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle(APPLICATION)
    .setVersion(VERSION)
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(PORT);
}

bootstrap().catch((error: Error) => {
  Logger.error(error.message, error.stack, 'Bootstrap');
  process.exitCode = 1;
});
