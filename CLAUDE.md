# CLAUDE.md

Backend en NestJS. Este archivo define las decisiones del proyecto. **Si una skill instalada contradice algo de aquí, este archivo manda.**

## Stack

- NestJS + TypeScript (strict)
- PostgreSQL + Drizzle ORM (`drizzle-kit` para migraciones)
- API REST documentada con OpenAPI (`@nestjs/swagger`)
- Consumidor principal: frontend Next.js con Server Actions, que genera un cliente tipado desde el OpenAPI
- Validación de entrada: `class-validator` + `class-transformer`
- Configuración: `@nestjs/config` con esquema Zod validado al arrancar
- Eventos entre módulos: `@nestjs/event-emitter`

## Comandos

> Ajustar al gestor de paquetes que use el proyecto.

```bash
pnpm start:dev          # desarrollo
pnpm build
pnpm lint               # incluye reglas de fronteras entre capas/módulos
pnpm test               # unitarios
pnpm test:e2e           # e2e contra Postgres real (Testcontainers)
pnpm db:generate        # drizzle-kit generate
pnpm db:migrate         # drizzle-kit migrate
```

Antes de dar una tarea por terminada: `pnpm lint && pnpm test` deben pasar.

## Arquitectura

**Monolito modular.** Cada módulo de Nest es un dominio de negocio (bounded context), no una capa técnica. Dentro de cada módulo se aplica arquitectura hexagonal.

```
src/
  modules/
    <modulo>/
      domain/            # entidades, value objects, errores y eventos de dominio
      application/       # casos de uso y puertos (interfaces)
      infrastructure/    # Drizzle: schema, repositorios, mappers; adaptadores externos
      presentation/      # controllers REST, DTOs de request/response
      <modulo>.module.ts
      index.ts           # API pública del módulo (lo único importable desde fuera)
  shared/                # kernel compartido mínimo: tipos base, utilidades puras
  infrastructure/        # transversal: conexión Drizzle, config, logger, filtros globales
  main.ts
```

### Reglas de dependencia (obligatorias)

1. `domain` no importa nada de Nest, Drizzle, HTTP ni de otras capas. TypeScript puro.
2. `application` solo importa de `domain` y define puertos (interfaces) para lo que necesite del exterior.
3. `infrastructure` implementa los puertos. Es el **único** lugar donde se importa Drizzle.
4. `presentation` solo llama a casos de uso de `application`. Nunca accede a repositorios ni a Drizzle.
5. **Entre módulos**: solo se importa desde el `index.ts` del otro módulo, o se reacciona a sus eventos. Prohibido importar `domain/`, `application/` o `infrastructure/` de otro módulo.
6. `shared/` no depende de ningún módulo.

Estas reglas se verifican con `eslint-plugin-boundaries`. No desactives reglas del linter para saltarlas; si una regla estorba, explica el caso y propón un cambio de diseño.

### Simplicidad primero

- **No usar CQRS (`@nestjs/cqrs`)** salvo que se pida explícitamente para un módulo concreto.
- Si un módulo es casi CRUD, se puede simplificar: el caso de uso puede ser delgado y la entidad anémica. No inventes value objects, agregados ni eventos que el negocio no necesita.
- No crear abstracciones "por si acaso". Una interfaz existe porque hay un puerto real o porque se necesita sustituir en tests.

## Convenciones de código

- Archivos en kebab-case con sufijo de rol: `create-order.use-case.ts`, `order.entity.ts`, `drizzle-order.repository.ts`, `order.mapper.ts`, `orders.controller.ts`, `create-order.dto.ts`.
- Un caso de uso = una clase con un método `execute(input)`.
- Inyección de puertos mediante tokens (`Symbol`) definidos en `application`, no por clase concreta:

```ts
// application/ports/order.repository.ts
export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// orders.module.ts
providers: [
  CreateOrderUseCase,
  { provide: ORDER_REPOSITORY, useClass: DrizzleOrderRepository },
];
```

## Drizzle

- Cada módulo define sus tablas en `infrastructure/persistence/<modulo>.schema.ts`. `drizzle.config.ts` las recoge con un glob.
- La conexión se provee una sola vez desde `src/infrastructure/database` bajo un token (`DRIZZLE`) y se inyecta solo en repositorios.
- Los tipos de fila (`InferSelectModel`) **nunca salen de `infrastructure`**. Siempre se convierten a entidades de dominio con un mapper (`toDomain` / `toPersistence`).
- Un módulo no hace joins contra tablas de otro módulo. Si necesita datos ajenos, los pide por la API pública del otro módulo o mantiene una proyección propia alimentada por eventos.
- Migraciones: `drizzle-kit generate` y luego `migrate`. **Nunca `drizzle-kit push`** fuera de prototipos locales. No editar migraciones ya aplicadas.
- Transacciones que abarcan varios repositorios: usar `@nestjs-cls/transactional` con el adaptador de Drizzle, de modo que el caso de uso marque la transacción sin conocer Drizzle.
- Para evitar N+1, cargar en lote con `inArray` en lugar de consultas dentro de bucles.

## API REST y OpenAPI

El OpenAPI es un contrato: el frontend genera su cliente a partir de él. Cambiarlo sin cuidado rompe el build del frontend.

- Activar el plugin CLI de `@nestjs/swagger` en `nest-cli.json` para inferir propiedades de los DTOs.
- Cada endpoint declara `@ApiTags`, su respuesta con `@ApiEnvelopeResponse(...)` y los errores relevantes (ver "Formato de respuesta").
- `operationId` estable y legible (`orders_create`, `orders_findById`), porque se convierte en el nombre de la función del cliente generado.
- DTOs de request y de response separados. Nunca devolver entidades de dominio ni filas de Drizzle directamente.
- `ValidationPipe` global con `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Rutas en plural y kebab-case (`/orders`, `/order-items/:id`). Paginación con `limit` y `cursor` (o `page`), siempre igual en toda la API.
- Cambios incompatibles en el contrato: avisar explícitamente en la respuesta.

## Formato de respuesta (obligatorio en toda la API)

Toda respuesta HTTP, de éxito o de error, usa este mismo envoltorio:

```ts
// src/shared/http/api-response.ts
export interface ApiResponse<T> {
  status: number; // igual al código HTTP real de la respuesta
  message: string; // mensaje legible para el usuario, en español
  data: T | null; // payload en éxito; null en error
  error: ApiError | null; // null en éxito; detalle en error
}

export interface ApiError {
  code: string; // estable y en SCREAMING_SNAKE_CASE: 'EMAIL_ALREADY_REGISTERED'
  details?: Record<string, string[]>; // p. ej. errores de validación por campo
}
```

Ejemplos:

```jsonc
// 201 éxito
{ "status": 201, "message": "Usuario creado correctamente", "data": { "id": "..." }, "error": null }

// 409 conflicto de negocio
{ "status": 409, "message": "El correo electrónico ya está registrado", "data": null,
  "error": { "code": "EMAIL_ALREADY_REGISTERED" } }

// 400 validación
{ "status": 400, "message": "Datos de entrada inválidos", "data": null,
  "error": { "code": "VALIDATION_ERROR", "details": { "curp": ["La CURP no tiene un formato válido"] } } }
```

### Reglas

- **Los controllers no construyen el envoltorio.** Devuelven solo el DTO de respuesta (o lanzan errores). El envoltorio lo aplican piezas globales en `src/infrastructure/http`:
  - `ResponseEnvelopeInterceptor`: envuelve toda respuesta exitosa en `{ status, message, data, error: null }`.
  - `GlobalExceptionFilter`: convierte cualquier error en `{ status, message, data: null, error }`.
- Mensaje de éxito: por defecto genérico según el método HTTP; se personaliza con el decorador `@ResponseMessage('Usuario creado correctamente')` en el handler.
- `status` del cuerpo **siempre coincide** con el código HTTP real. Nunca responder HTTP 200 con `status: 400` en el cuerpo.
- Usar el código HTTP semánticamente correcto: 400 validación, 401 no autenticado, 403 sin permiso, 404 no encontrado, **409 conflicto/duplicado**, 422 regla de negocio incumplida, 500 error inesperado.
- `error.code` es el contrato para el frontend (que decide lógica por código, no por texto). Una vez publicado, no se renombra.
- Errores 500: `message` genérico ("Ocurrió un error inesperado"), sin stack ni detalles internos. El detalle va solo al log.
- Los errores del `ValidationPipe` se transforman a `VALIDATION_ERROR` con `details` por campo (usar `exceptionFactory`).
- Respuestas paginadas: `data` es `{ items: T[], nextCursor: string | null }`.
- Excepciones: endpoints que devuelven archivos o streams, y health checks. Se marcan con `@SkipEnvelope()`.

### Errores de dominio

- El dominio lanza errores propios que extienden `DomainError` con `code` y `message`, sin conocer HTTP:

```ts
export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super(
      'EMAIL_ALREADY_REGISTERED',
      'El correo electrónico ya está registrado',
    );
  }
}
```

- Un error = un caso. No usar un error genérico con un ternario en el mensaje: correo y CURP duplicados son `EmailAlreadyRegisteredError` y `CurpAlreadyRegisteredError`.
- El `GlobalExceptionFilter` mapea cada `code` a su código HTTP mediante una tabla en `src/infrastructure/http/error-status.map.ts`. Sin entrada en la tabla → 422 para `DomainError`, 500 para cualquier otro.
- No lanzar `HttpException` desde `domain` ni `application`.

### OpenAPI

- El envoltorio debe reflejarse en Swagger para que el cliente generado en Next quede tipado. Usar el decorador `@ApiEnvelopeResponse(Dto, { status })` (definido en `src/infrastructure/http`, basado en `ApiExtraModels` + `getSchemaPath` + `allOf`) en lugar de `@ApiOkResponse` directo.
- Documentar las respuestas de error relevantes de cada endpoint con el mismo esquema y su `error.code`.

## Eventos entre módulos

- Los eventos de dominio se nombran en pasado (`OrderPlaced`) y se definen en el `domain` del módulo emisor, exportados por su `index.ts`.
- Los listeners viven en `application` del módulo receptor.
- Un listener no debe asumir orden ni ejecución única: debe ser idempotente.
- Si un evento no puede perderse (por ejemplo, ligado a pagos), proponer el patrón outbox en lugar del emisor en memoria.

## Configuración y seguridad

- Toda variable de entorno se declara en el esquema Zod de config. Nada de `process.env` fuera de `src/infrastructure/config`.
- No escribir secretos en el código, tests ni ejemplos. Usar `.env.example` con valores ficticios.
- La app es stateless: sesiones y caché van a Redis, trabajo pesado a colas (BullMQ), para poder escalar horizontalmente.

## Tests

- `domain`: tests unitarios puros, sin `Test.createTestingModule`.
- `application`: casos de uso con repositorios en memoria que implementan el mismo puerto.
- `infrastructure` y e2e: contra PostgreSQL real con Testcontainers. No mockear Drizzle.
- Los tests van junto al archivo (`*.spec.ts`); los e2e en `test/`.

## Flujo para un módulo o feature nuevo

1. Modelar en `domain` (entidades, errores y eventos que de verdad hagan falta).
2. Escribir el caso de uso y sus puertos en `application`, con su test usando repositorio en memoria.
3. Implementar schema, mapper y repositorio Drizzle en `infrastructure`; generar la migración.
4. Exponer controller y DTOs en `presentation` con decoradores OpenAPI completos.
5. Registrar todo en `<modulo>.module.ts` y exportar solo lo necesario en `index.ts`.
6. Ejecutar `pnpm lint && pnpm test` antes de terminar.

## Qué no hacer

- Importar Drizzle fuera de `infrastructure`.
- Importar internals de otro módulo.
- Devolver entidades o filas de base de datos desde un controller.
- Añadir CQRS, microservicios, GraphQL o nuevas dependencias sin que se pida.
- Usar `any` o desactivar reglas de lint o de TypeScript para que algo compile.
