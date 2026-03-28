import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const frontendOrigin = process.env.FRONTEND_URL;
  const allowedOrigins = [frontendOrigin].filter(
    (origin): origin is string => !!origin,
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isLocalDevOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      callback(null, isExplicitlyAllowed || isLocalDevOrigin);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
