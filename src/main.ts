import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// 1. Importamos el filtro y los guards que creaste
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('apiPrefix', 'api');
  const swaggerEnabled = config.get<boolean>('swaggerEnabled', true);
  const port = config.get<number>('port', 3000);

  app.setGlobalPrefix(apiPrefix);

  // =========================================================
  // 2. CONECTAMOS LA SEGURIDAD Y EL MANEJO DE ERRORES GLOBAL
  // =========================================================
  
  // Activa el formateo de errores que pide el profesor
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Activa la lectura de tokens y roles en todos los endpoints
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
  
  // =========================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Library Loans API')
      .setDescription('Examen parcial ISIS 3710 — Sistema de préstamos de biblioteca')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, doc);
  }

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Library Loans API en http://localhost:${port}/${apiPrefix}`);
  if (swaggerEnabled) {
    // eslint-disable-next-line no-console
    console.log(`Swagger UI: http://localhost:${port}/${apiPrefix}/docs`);
  }
}

bootstrap();