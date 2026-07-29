import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Global prefix
  const apiPrefix = configService.get('app.apiPrefix');
  app.setGlobalPrefix(apiPrefix);
  
  // CORS
  app.enableCors({
    origin: configService.get('app.corsOrigin'),
    credentials: true,
  });
  
  // Security
  app.use(helmet());
  app.use(compression());
  
  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Festival Mbois Intelligence Platform API')
    .setDescription('API Documentation for Festival Mbois Social Media Intelligence Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Platforms', 'Social media platforms endpoints')
    .addTag('Posts', 'Posts management endpoints')
    .addTag('Influencers', 'Influencers management endpoints')
    .addTag('Analytics', 'Analytics and insights endpoints')
    .addTag('Keywords', 'Keywords management endpoints')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  
  // Start server
  const port = configService.get('app.port');
  await app.listen(port);
  
  console.log(`
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║   🎉 Festival Mbois Intelligence Platform - Backend API      ║
  ║                                                               ║
  ║   Server is running on: http://localhost:${port}                ║
  ║   API Documentation: http://localhost:${port}${apiPrefix}/docs      ║
  ║   Environment: ${configService.get('app.env')}                        ║
  ║                                                               ║
  ║   Created by: Kharisman (maskhar.com)                        ║
  ║   Organization: Utero Indonesia                              ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
