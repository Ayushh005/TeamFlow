import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Cookie Parser middleware
  app.use(cookieParser(process.env.COOKIE_SECRET || 'teamflow_secure_cookie_secret'));

  // 2. Strict CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
  });

  // 3. Global API Route Prefix (/api/v1)
  app.setGlobalPrefix('api/v1');

  // 4. Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips properties that do not have any decorators
      forbidNonWhitelisted: true, // Throws error if non-whitelisted values are provided
      transform: true, // Automatically transforms payloads to DTO instances
    }),
  );

  // 5. Swagger / OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('TeamFlow API Documentation')
    .setDescription(
      'Production-grade Multi-Tenant Workspace API with RBAC, Realtime Collaboration, MinIO Storage, and BullMQ queues.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 TeamFlow API running on: http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger OpenAPI docs live at: http://localhost:${port}/api/docs`);
}

bootstrap();
