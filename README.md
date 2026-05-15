# Library Loans API - Examen Parcial ISIS 3710

Backend para el sistema de gestión de préstamos de biblioteca, desarrollado con NestJS, TypeORM y PostgreSQL.

## 🚀 Comandos de Arranque

Siga estos pasos para configurar y ejecutar el proyecto en su entorno local:

1. **Configuración de variables de entorno:**
   ```bash
   cp .env.example .env


# 2) Base de datos
docker compose up -d

# 3) Dependencias
npm install

# 4)migrations 
npm run migration:run

# 4) Build
npm run build

# 5) Arrancar la app en modo desarrollo
npm run start:dev

La documentación interactiva está disponible en: http://localhost:3000/api/docs.

Para probar los endpoints protegidos con @ApiBearerAuth():

Use el endpoint POST /api/auth/register para crear un usuario.

Use POST /api/auth/login para obtener el accessToken.

En Swagger, haga clic en el botón "Authorize" y pegue el token.

Credenciales recomendadas para pruebas:

Email: admin@biblioteca.local

Password: Strong-Password-123!

Role: admin

⚙️ Decisión Técnica: Transición Automática a Overdue (Regla R5)
Para dar cumplimiento a la Regla R5 sin la sobrecarga de un proceso en segundo plano (Cron Job), se implementó una estrategia de Actualización Perezosa (Lazy Update) en el LoansService.

Cada vez que se invoca una operación de consulta o creación en el servicio de préstamos, se ejecuta internamente el método updateOverdueLoansAutomatically(). Este método realiza una actualización masiva en la base de datos para todos los registros que han superado su fecha de vencimiento (dueAt < now) y aún están en estado active. Esto garantiza integridad en las reglas de negocio y consistencia en los datos retornados al cliente sin impactar el rendimiento del servidor.


# BONO 2 IMPLEMENTADO