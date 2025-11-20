import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['debug', 'warn', 'error'],
  });
  app.setGlobalPrefix('api/v1');
  app.set('trust proxy', 1);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? ['https://frontend.com']
        : ['http://localhost:3000', 'http://localhost:4321'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
    credentials: true,
    maxAge: 86400,
  });

  const config = new DocumentBuilder()
    .setTitle('QuickSlot Booking API')
    .setDescription(
      `
# QuickSlot Booking System API

A unified API for managing appointments, businesses, staff, and customers.

### 🔐 Authentication
- Access Token (short-lived)
- Refresh Token (rotating / cookie or Authorization header)
- Optional OAuth login (Google)
- Rate limiting on sensitive routes

### 👥 User Types
- **Customer** – browse, book, manage appointments  
- **Staff** – view assigned services, schedules, and bookings  
- **Business Owner** – manage business, services, staff, and bookings  

### 📦 Core Modules

#### Auth
- Register  
- Login  
- OAuth (Google)  
- Logout  
- Token refresh  

#### User
- Profile  
- Update account  

#### Business
- Business profile  
- Staff management  
- Services  

#### Staff
- Staff profile  
- Assigned services  
- Staff bookings  
- Schedule  
- Statistics  

#### Booking
- Customer bookings  
- Staff bookings  
- Owner bookings  
- Status updates  
- Booking lifecycle management  

### 🌍 Base URLs
- Dev: **http://localhost:4000/api/v1**
- Prod: **https://quick-slot.com/api/v1**
`,
    )
    .setVersion('1.0')
    .addTag('Auth', 'Authentication, session, and OAuth flows')
    .addTag('User', 'User profile & settings')
    .addTag('Business', 'Business management & staff operations')
    .addTag('Staff', 'Staff-only tools such as schedule & stats')
    .addTag('Service', 'Service catalog and management')
    .addTag('Booking', 'Customer/Staff/Owner booking operations')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });
  SwaggerModule.setup('api/v1/docs', app, document);

  await app.listen(process.env.PORT ?? 4000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 4000}`,
  );
  console.log(
    `Swagger docs available at: http://localhost:${process.env.PORT ?? 4000}/api/v1/docs`,
  );
}
bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
