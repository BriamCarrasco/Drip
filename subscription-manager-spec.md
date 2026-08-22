# Gestor de Suscripciones Autohospedado — Spec para desarrollo

## 1. Contexto y objetivo

Proyecto de portafolio open source. Es una app **self-hosted** para llevar el control de
suscripciones recurrentes (streaming, software, dominios, hosting, etc.): cuánto se paga,
cuándo se renueva, y avisos antes de cada cobro.

Prioridad #1: **facilidad de despliegue**. El usuario final debe poder levantar todo con
un solo `docker compose up`, sin depender de servicios externos (sin Supabase, sin
Postgres administrado, sin proveedores OAuth externos).

## 2. Requisitos no funcionales (innegociables)

- Un único contenedor Docker (monolito).
- Sin dependencias de servicios cloud de terceros.
- Persistencia en archivo local (SQLite montado como volumen).
- Configuración mínima vía variables de entorno (`.env`).
- Debe poder correr en una Raspberry Pi / mini PC de homelab sin problema.

## 3. Stack tecnológico

- **Framework**: Next.js (App Router) — sirve frontend y backend en el mismo proceso.
  - Route Handlers (`app/api/*/route.ts`) para endpoints que lo requieran.
  - Server Actions para mutaciones simples (crear/editar/eliminar suscripción).
- **Lenguaje**: TypeScript.
- **Base de datos**: SQLite.
- **ORM**: Drizzle ORM (con driver `better-sqlite3` o `libsql`).
- **Auth**: Auth.js (NextAuth) con Credentials Provider (email + password, hash con
  bcrypt/argon2). Sin proveedores OAuth externos en el MVP.
- **Notificaciones**: [Apprise](https://github.com/caronc/apprise) invocado desde un
  proceso hijo o vía servicio HTTP liviano de Apprise, para soportar 80+ canales
  (Discord, Telegram, email, Pushover, etc.) mediante una sola URL de configuración
  por usuario.
- **Scheduler**: `node-cron`, inicializado en `instrumentation.ts` (hook de Next.js que
  corre una vez al levantar el servidor). Corre diariamente y evalúa qué suscripciones
  están por vencer según `notification_days_before`.
- **Estilos**: Tailwind CSS.
- **Build para producción**: `output: 'standalone'` en `next.config.js`.

⚠️ Importante: cualquier route handler que acceda a la base de datos debe correr en
**Node.js runtime**, nunca `edge` (SQLite no funciona en Edge runtime).

## 4. Modelo de datos (MVP)

**`users`**
- `id` (pk)
- `email` (unique)
- `password_hash`
- `created_at`

**`subscriptions`**
- `id` (pk)
- `user_id` (fk → users)
- `name`
- `description` (opcional)
- `amount` (decimal)
- `currency` (ISO code, ej. `CLP`, `USD`)
- `billing_cycle` (`weekly` | `monthly` | `yearly` | `custom_days`)
- `custom_interval_days` (nullable, solo si `billing_cycle = custom_days`)
- `next_billing_date`
- `category` (string libre o enum simple: streaming, software, hosting, otro)
- `notification_days_before` (int, default 3)
- `apprise_url` (opcional, override del canal global del usuario)
- `is_active` (bool)
- `created_at`, `updated_at`

**`settings`** (por usuario, opcional en MVP)
- `user_id` (fk)
- `default_apprise_url`
- `default_currency`

## 5. Funcionalidades MVP (v1)

1. Registro/login (single-user o multiusuario simple, admin/user).
2. CRUD completo de suscripciones.
3. Vista de lista ordenada por próxima fecha de cobro.
4. Cálculo de gasto total proyectado (mensual y anual).
5. Cron diario que evalúa suscripciones próximas a vencer y dispara notificación vía
   Apprise.
6. Formulario de configuración de canal de notificación (URL de Apprise).

## 6. Roadmap futuro (post-MVP)

**v2**
- Detección de posibles duplicados/solapamientos (ej. varios servicios de streaming).
- Soporte multi-moneda con tasa de conversión.
- Modo "compartido" para suscripciones familiares.

**v3**
- Parsing de emails de confirmación de pago (integración opcional con Gmail vía OAuth)
  para sugerir automáticamente nuevas suscripciones detectadas.

**v4**
- API pública documentada.
- Exportación a CSV/Excel.
- Dashboard de analítica de gasto histórico por categoría.
- Opción de usar Postgres en vez de SQLite vía variable de entorno, para instalaciones
  grandes (mantener SQLite como default).

## 7. Estructura de carpetas esperada

```
/app
  /api/*/route.ts
  /(dashboard)/...
/lib
  db.ts              # cliente Drizzle
  auth.ts            # config Auth.js
  scheduler.ts        # lógica del cron + llamada a Apprise
  apprise.ts
/drizzle
  schema.ts
  migrations/
instrumentation.ts    # arranca el scheduler al boot
Dockerfile
docker-compose.yml
.env.example
```

## 8. Docker y despliegue

- `Dockerfile` multi-stage: build de Next.js con `output: 'standalone'`, imagen final
  liviana (node:alpine).
- `docker-compose.yml` de ejemplo con:
  - Volumen persistente para el archivo SQLite (ej. `./data:/app/data`).
  - Variables de entorno documentadas.
- Incluir healthcheck endpoint simple (`/api/health`).

## 9. Variables de entorno

```
DATABASE_URL=file:/app/data/subscriptions.db
AUTH_SECRET=
DEFAULT_APPRISE_URL=
TZ=America/Santiago
```

## 10. Convenciones de desarrollo

- Commits siguiendo Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) para poder
  automatizar changelog más adelante.
- Tests unitarios mínimos para lógica de cálculo de fechas de renovación y gasto total
  (es la parte con más riesgo de bugs silenciosos).
- README con instrucciones claras de `docker compose up` como primer paso, antes que
  cualquier instrucción de desarrollo local.
- Licencia open source permisiva (ej. MIT), a definir por el usuario.

## 11. Fuera de alcance para v1

- Apps móviles nativas.
- Integraciones OAuth con servicios externos (Gmail, etc.) — queda para v3.
- Postgres u otro motor de base de datos — SQLite únicamente en el MVP.
- Internacionalización (i18n) — un solo idioma en el MVP.

---

**Instrucción para Claude Code**: usa este documento como fuente de verdad para
scaffolding inicial del proyecto. Empieza por el modelo de datos (schema de Drizzle) y
la configuración de Auth.js, luego el CRUD de suscripciones, y deja el scheduler +
Apprise para el final una vez que el resto del flujo esté probado.
