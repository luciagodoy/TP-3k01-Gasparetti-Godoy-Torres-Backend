# TP DSW - Gestión Hotelera (Backend)

API REST para un sistema de gestión hotelera: reservas, habitaciones, huéspedes, servicios
adicionales, check-in/check-out y comprobantes de pago. Desarrollado con Express, TypeScript
y Sequelize sobre MySQL.

## Requisitos

- Node.js 20, 22 o 24 (las versiones que prueba la CI)
- Una base de datos MySQL accesible (local o un servicio administrado como Aiven)

## Instalación

```bash
git clone <url-de-este-repositorio>
cd TP-3k01-Gasparetti-Godoy-Torres-Backend
npm install
```

### Variables de entorno

```bash
cp .env.example .env
```

`.env.example` documenta cada variable. Las principales:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: datos de la base de datos.
- Conectado a un proveedor administrado que exige TLS (Aiven), necesita `DB_SSL=true` y el
  certificado CA que da Aiven: `DB_CA_PATH` con la ruta al archivo (cómodo en local) o
  `DB_CA_CERT` con el contenido PEM pegado (para contenedores y plataformas de deploy, donde
  `certs/` no existe porque está en `.gitignore`).
- `JWT_SECRET` es la clave usada para firmar los tokens de sesión.
- `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` son las credenciales de la cuenta
  administradora que el servidor crea automáticamente la primera vez que arranca (ver
  [Cuenta admin inicial](#cuenta-admin-inicial)).
- `NODE_ENV=production` en el servidor desplegado: los errores 500 dejan de incluir el detalle
  interno y el esquema deja de sincronizarse solo (ver `DB_SYNC` más abajo).
- `FRONTEND_URL`: origen del frontend que CORS deja pasar.
- `TRUST_PROXY` y `RATE_LIMIT_MAX`: ver [Límite de peticiones](#límite-de-peticiones).

## Ejecutar en desarrollo

```bash
npm run dev
```

El servidor queda escuchando en `http://localhost:3000` (o el puerto en `PORT`).
Fuera de producción, al arrancar sincroniza el esquema de la base de datos automáticamente (no
hay migraciones: se usa `sequelize.sync({ alter: true })`). Con `NODE_ENV=production` no lo
hace, porque sería modificar el esquema de la base real sin revisión: hay que pedirlo
explícitamente con `DB_SYNC=alter`, sólo en el primer deploy para crear las tablas, y sacarlo
después.

### Datos de ejemplo

Con las tablas ya creadas (después de levantar el servidor al menos una vez):

```bash
npm run seed:ubicaciones    # provincias y ciudades de Argentina, desde la API pública Georef
npm run seed:habitaciones   # categorías con fotos y habitaciones de ejemplo
```

Se pueden correr más de una vez: no duplican filas.

## Build de producción

```bash
npm run build    # compila TypeScript a dist/
npm start        # corre el build compilado
```

## Docker

```bash
docker compose up --build -d    # levantar
docker compose logs -f api      # ver logs
docker compose down             # bajar
```

Corre localmente la misma imagen que se despliega. Los secretos se leen del `.env` en tiempo
de ejecución (nunca quedan dentro de la imagen) y el certificado de Aiven se monta de sólo
lectura desde `./certs`. El contenedor corre endurecido: filesystem de sólo lectura, sin
capabilities de Linux y con límites de memoria y procesos.

## Health checks

| Ruta | Para qué |
|---|---|
| `GET /health` | El proceso está vivo. No consulta la base a propósito: un corte breve de MySQL no debe hacer que la plataforma reinicie un contenedor sano. |
| `GET /health/detallado` | La API puede atender pedidos: verifica la conexión a la base y responde `503` si no la alcanza. |

Están fuera del prefijo `/api` y del límite de peticiones.

## Tests

```bash
npm test             # corre toda la suite una vez
npm run test:watch
```

Los tests corren contra una base de datos SQLite en memoria (no contra la base de datos real
configurada en `.env`), así que no requieren red ni credenciales para ejecutarse.

## Cuenta admin inicial

Como la gestión de usuarios (`/api/usuarios`) requiere rol `admin`, no existe una forma de crear
el primer usuario administrador a través de la API. En su lugar, el servidor revisa al arrancar
si ya existe algún usuario con rol `admin` y, si no hay ninguno, crea uno con los valores de
`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` (por defecto `admin` / `admin@hotel.local` /
`admin123` si no se configuran). En producción no hay contraseña por defecto: si todavía no
existe ningún admin y falta `ADMIN_PASSWORD`, el servidor no arranca.

## Niveles de acceso

Hay tres niveles de acceso:

- **Huésped** (cualquier usuario autenticado): puede reservar para sí mismo, agregar servicios a
  su propia reserva, ver y cancelar sus propias reservas (`/api/*/mias`, `/api/huespedes/me`).
- **Empleado**: la operación diaria del hotel. Gestiona reservas de cualquier huésped,
  check-in/check-out y comprobantes, habitaciones, categorías, huéspedes, servicios, cupos,
  precios, consumos de servicios, provincias y ciudades.
- **Admin**: todo lo que puede hacer un empleado, más la gestión de usuarios y empleados
  (`/api/usuarios`, `/api/empleados`).

Los endpoints de sólo lectura necesarios para que un huésped explore el sitio sin sesión
(habitaciones, categorías, servicios, ciudades, provincias, cupos, precios vigentes) son públicos.

Sin token, o con un token inválido, la API responde `401`. Con un token válido cuyo rol no
alcanza para esa ruta, responde `403`: la sesión sigue siendo válida, sólo no tiene permiso.

## Límite de peticiones

- Toda la API (`/api`): 600 peticiones por IP cada 15 minutos, ajustable con `RATE_LIMIT_MAX`.
- `POST /api/auth/login`: 20 intentos por IP cada 15 minutos.
- `POST /api/huespedes/registro`: 10 altas por IP por hora.

Si la app corre detrás de un proxy inverso (nginx), `TRUST_PROXY`
indica cuántos proxies confiar. Sin eso, el límite agrupa a todos los usuarios bajo la IP del
proxy.

## Estructura del proyecto

```
src/
├── config/       # conexión a la base de datos, JWT, seed del admin inicial
├── controllers/  # lógica de negocio por entidad
├── middleware/   # autenticación (JWT) y límite de peticiones
├── models/       # modelos Sequelize y sus asociaciones
├── routes/       # definición de endpoints por entidad (incluye /health)
├── scripts/      # carga de datos de ejemplo (npm run seed:*)
├── test/         # setup de tests, unitarios e integración
├── utils/        # utilidades compartidas (manejo de errores)
├── app.ts        # instancia de Express (sin levantar el servidor; usado también por los tests)
└── index.ts      # punto de entrada: conecta la DB, sincroniza el esquema y levanta el servidor
docs/
└── database/     # modelo de la base de datos (MySQL Workbench)
```

## Documentación de la API

Endpoints principales (todos bajo el prefijo `/api`):

| Recurso | Rutas |
|---|---|
| Auth | `POST /auth/login` |
| Habitaciones | `GET,POST /habitaciones`, `GET,PUT,DELETE /habitaciones/:id` |
| Categorías de habitación | `GET,POST /categorias`, `GET,PUT,DELETE /categorias/:id` |
| Huéspedes | `POST /huespedes/registro`, `GET /huespedes/me`, `GET /huespedes`, `GET,PUT,DELETE /huespedes/:id` |
| Reservas | `GET,POST,PUT,DELETE /reservas[/:id]`, `POST /reservas/:id/checkin`, `POST /reservas/:id/checkout` (devuelve el comprobante en PDF), `GET /reservas/:id/comprobante`, `POST,GET /reservas/mias`, `POST /reservas/:id/cancelar` |
| Servicios adicionales | `GET,POST,PUT,DELETE /servicios[/:id]`, `GET,POST,PUT,DELETE /cupos[/:id]`, `GET,POST,PUT,DELETE /precios-servicio[/:id]`, `GET,POST,PUT,DELETE /reserva-servicios[/:id]`, `POST /reserva-servicios/mias` |
| Ubicaciones | `GET,POST,PUT,DELETE /provincias[/:id]`, `GET,POST,PUT,DELETE /ciudades[/:id]` |
| Empleados | `GET,POST,PUT,DELETE /empleados[/:id]` |
| Usuarios | `GET,POST,PUT,DELETE /usuarios[/:id]` |

Las rutas que no figuran como públicas en [Niveles de acceso](#niveles-de-acceso) requieren el
header `Authorization: Bearer <token>` de una cuenta con el rol correspondiente: empleado o
admin para la operación del hotel, sólo admin para usuarios y empleados.
