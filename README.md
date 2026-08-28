# D(r)ip

*dip / drip* — el goteo lento de plata que se va en cargos recurrentes.

Aplicación **autohospedada** (self-hosted) para llevar el control de tus suscripciones:
cuánto pagás, cuándo se cobra cada una y cómo fue cambiando el precio con el tiempo.

**No se conecta a tu banco.** En vez de detectar cobros después de que ocurrieron, vos
registrás tus suscripciones y la app se adelanta: te avisa antes del cobro por Discord,
Telegram, email u otros 80+ canales soportados por
[Apprise](https://github.com/caronc/apprise), antes de que termine una prueba gratuita, y
registra cada cambio de precio.

Pensada para correr en un homelab, mini PC o Raspberry Pi: un solo contenedor Docker,
sin dependencias de servicios cloud de terceros, con toda la persistencia en un archivo
SQLite local.

## Qué hace

- **Gasto mensual y anual** combinado de todas tus suscripciones activas.
- **Avisos antes del cobro** vía Apprise, con recuperación si el servidor estuvo apagado.
- **Calendario** de próximos cobros del mes.
- **Historial de precios**: cuánto subió cada servicio y cuánto llevás pagado.
- **Gasto compartido**: dividí una suscripción entre varias personas y mirá solo tu parte.
- **Pruebas gratuitas**: avisos antes de que empiecen a cobrarte.
- **CLP y USD**, con tipo de cambio manual o automático.

## Empezar con Docker (recomendado)

Requisitos: Docker y Docker Compose.

### Opción A — imagen prearmada

1. Creá una carpeta para la app con este `compose.yaml`:

   ```yaml
   name: drip

   services:
     app:
       image: ghcr.io/briamcarrasco/drip:latest
       container_name: drip
       pull_policy: always
       ports:
         - "3000:3000"
       environment:
         AUTH_SECRET: ${AUTH_SECRET:-}
         REGISTRATION_ENABLED: ${REGISTRATION_ENABLED:-true}
         TZ: ${TZ:-America/Santiago}
       volumes:
         - drip-data:/app/data
       restart: unless-stopped

   volumes:
     drip-data:
   ```

2. Levantá:

   ```bash
   docker compose up -d
   ```

3. Abrí [http://localhost:3000](http://localhost:3000), creá tu usuario y empezá a
   registrar suscripciones. Para actualizar más adelante: `docker compose pull && docker compose up -d`.

En el primer arranque, si no definiste `AUTH_SECRET`, la app genera uno y lo guarda en el
volumen (`/app/data/.auth-secret`). Para fijarlo vos mismo — recomendado si vas a correr
varias instancias o restaurar el backup en otra máquina — creá un `.env` al lado del
`compose.yaml` (docker compose lo toma solo):

   ```bash
   echo "AUTH_SECRET=$(openssl rand -base64 33)" > .env
   ```

### Opción B — build desde el código

```bash
git clone https://github.com/BriamCarrasco/Drip.git drip && cd drip
docker compose up -d --build
```

Para fijar variables (`AUTH_SECRET`, `REGISTRATION_ENABLED`, `TZ`), copiá `.env.example` a
`.env` antes del `up`.

### Persistencia

Los datos viven en el volumen `drip-data`, gestionado por Docker: sobreviven a
`pull`, `up` y actualizaciones del contenedor. Backup:

```bash
docker run --rm -v drip-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/drip-$(date +%F).tar.gz -C /data .
```

Si preferís tener el `.db` como archivo suelto en el host, cambiá `drip-data:/app/data`
por `./data:/app/data` (y quitá el bloque `volumes:`), y hacé una vez
`sudo chown -R 1001:1001 ./data` — el contenedor corre como usuario sin privilegios
(uid 1001) y necesita poder escribir esa carpeta.

### Variables de entorno

| Variable               | Descripción                                                                                          | Default                |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ---------------------- |
| `AUTH_SECRET`          | Secreto que usa Auth.js para firmar las sesiones. Si no lo definís, se genera uno en el primer arranque y se guarda en el volumen (`/app/data/.auth-secret`). Definilo explícito para multi-instancia o restaurar backups en otra máquina. | autogenerado           |
| `REGISTRATION_ENABLED` | Permite crear cuentas nuevas desde `/register`. Ponelo en `false` para cerrar el registro una vez creadas las cuentas. | `true`                 |
| `TZ`                   | Zona horaria usada por el cron diario de notificaciones.                                             | `America/Santiago`     |
| `DATABASE_URL`         | Opcional. Ruta del archivo SQLite. En Docker no hace falta tocarlo.                                  | `file:./data/drip.db`  |

## Multiusuario

La app no es un SaaS ni tiene un rol de administrador: el soporte multiusuario existe
para que distintas personas que comparten el mismo equipo puedan tener cada una su
propia lista de suscripciones. El registro es libre por defecto (usuario + contraseña,
sin correo electrónico); podés cerrarlo con `REGISTRATION_ENABLED=false` después de crear
las cuentas. Si vas a exponer la instancia fuera de tu red local, ponla detrás de tu
propio proxy/VPN o algún control de acceso adicional.

## Conversión de moneda (opcional)

La app solo soporta CLP y USD. En Configuración → Preferencias podés elegir cómo se
calcula el tipo de cambio usado para mostrar tu gasto total combinado en tu moneda por
defecto:

- **Manual** (por defecto): vos ingresás el valor de referencia (1 USD = X CLP) y lo
  actualizás cuando quieras. No requiere conexión a internet.
- **Automático**: la app consulta una vez al día la [API pública de mindicador.cl](https://mindicador.cl)
  (dólar observado, sin API key) para mantener el tipo de cambio actualizado, con tu
  valor manual como respaldo si la consulta falla o no hay internet.

Con el modo automático activado, Estadísticas también muestra cuánto de lo que subió
cada suscripción en USD es aumento real del proveedor y cuánto es solo el dólar —
consultando (y cacheando para siempre) el tipo de cambio histórico de mindicador.cl del
día en que registraste cada suscripción. En modo manual esto no aparece, ya que
requeriría esa misma consulta externa.

Estas son las únicas llamadas a un servicio externo en toda la app, y son opt-in: si no
activás el modo automático, la instancia no hace ninguna petición fuera de tu red.

## Logos de suscripciones

Cada suscripción tiene un campo opcional "URL de logo". Al crear una nueva, la lista de
"Servicios conocidos" pre-carga el logo y la categoría para varias apps populares
(Netflix, Spotify, Notion, Figma, etc.). Para el resto, podés pegar tu propia URL —
tiene que apuntar directo a un archivo de imagen, no a una página web que la muestre
(por ejemplo, un link de Dreamstime o de un buscador de imágenes no funciona: esos son
HTML, no la imagen en sí). Si la URL falla o queda vacía, se usa automáticamente un
avatar con la inicial del nombre.

Fuentes recomendadas para conseguir un link directo:

- **[Simple Icons](https://simpleicons.org)** — logos de marcas en SVG, con color a
  elección: `https://cdn.simpleicons.org/{nombre}/{colorHEX}` (ej.
  `https://cdn.simpleicons.org/netflix/E50914`).
- **Favicon vía DuckDuckGo** — funciona para casi cualquier sitio, aunque se ve más
  simple: `https://icons.duckduckgo.com/ip3/{dominio}.ico` (ej.
  `https://icons.duckduckgo.com/ip3/netflix.com.ico`).
- **Press kit / brand assets oficial** del servicio — buscar "[servicio] press kit" y
  copiar el link directo de la imagen (botón derecho → copiar dirección de imagen),
  nunca el link de la página que solo la muestra.

Para saber si una URL sirve: abrila en una pestaña nueva. Si el navegador muestra *solo
la imagen*, funciona. Si muestra una página con texto alrededor, no.

### Cómo se sirven los logos

El navegador **nunca** pide el logo al servidor externo. La primera vez que se usa una
URL, la app la descarga desde el servidor, la guarda en la base SQLite y desde entonces
la sirve desde su propio origen (`/api/logo`). Esto tiene tres consecuencias:

- **Funciona en cualquier navegador**, sin importar bloqueadores de anuncios, escudos de
  privacidad (Brave) o DNS filtrado: para el navegador es un recurso local más.
- **Funciona sin internet** después de la primera descarga, y sigue funcionando aunque el
  sitio original desaparezca.
- **El logo viaja en tu backup**: al estar en el `.db`, se respalda junto con el resto.

Como el servidor descarga URLs que escribe el usuario, el endpoint valida que la
dirección no apunte a la red interna (bloquea loopback, rangos privados, link-local y sus
equivalentes IPv6, incluso a través de redirecciones), exige autenticación, limita el
tamaño y solo acepta respuestas con `Content-Type` de imagen. Los SVG se sirven con
`Content-Security-Policy: sandbox` y `X-Content-Type-Options: nosniff` para que no puedan
ejecutar scripts.

## Recuperación de cuenta

No existe un flujo de "olvidé mi contraseña", ya que la app no usa correo electrónico ni
depende de ningún servicio externo para enviar mails. Si pierdes el acceso a una cuenta,
podés operar sobre la base SQLite (`/app/data/drip.db` dentro del contenedor) con las
dependencias que ya trae la imagen. Por ejemplo, para borrar un usuario (perderás sus
suscripciones):

```bash
docker compose exec app node -e "require('better-sqlite3')('/app/data/drip.db').prepare('DELETE FROM users WHERE username = ?').run('tu_usuario')"
```

O generá un hash bcrypt nuevo para una contraseña conocida y reemplazá el `password_hash`
de ese usuario.

## Desarrollo local

Requisitos: Node.js 22+ y Python 3 (usado por el CLI de Apprise en tiempo de ejecución).

```bash
npm install
echo "AUTH_SECRET=$(openssl rand -base64 33)" > .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Las migraciones de Drizzle se
aplican automáticamente al iniciar.

Otros comandos útiles:

```bash
npm run lint          # ESLint
npm run build         # build de producción
npm run test          # pruebas unitarias (Vitest)
npm run test:coverage # pruebas + reporte de cobertura
npm run db:generate   # genera una nueva migración a partir de drizzle/schema.ts
```

## Stack

Next.js (App Router) · TypeScript · Drizzle ORM + SQLite (`better-sqlite3`) · Auth.js
(Credentials) · Tailwind CSS · `node-cron` · Apprise.

## Licencia

[MIT](./LICENSE)
