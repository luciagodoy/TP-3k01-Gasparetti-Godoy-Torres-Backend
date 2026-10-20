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

`DB_SYNC` sólo tiene efecto cuando el servidor arranca con `npm start` (Docker, una VM). En
**Vercel** el punto de entrada es `src/app.ts` y `index.ts` no corre, así que ni el esquema ni
la cuenta admin inicial se crean solos: las tablas nuevas se crean con su script. Antes de
desplegar las tarifas dinámicas hay que correr una vez
[`docs/database/reglas-tarifa.sql`](docs/database/reglas-tarifa.sql) contra la base; sin esa
tabla fallan la cotización y las reservas de los huéspedes.

### Datos de ejemplo

Con las tablas ya creadas (después de levantar el servidor al menos una vez):

```bash
npm run seed:locations   # provincias y ciudades de Argentina, desde la API pública Georef
npm run seed:rooms       # categorías con fotos y habitaciones de ejemplo
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
| `GET /health/detailed` | La API puede atender pedidos: verifica la conexión a la base y responde `503` si no la alcanza. |

Están fuera del prefijo `/api` y del límite de peticiones.

## Tests

```bash
npm test             # corre toda la suite una vez
npm run test:watch
```

Los tests corren contra una base de datos SQLite en memoria (no contra la base de datos real
configurada en `.env`), así que no requieren red ni credenciales para ejecutarse.

## Cuenta admin inicial

Como la gestión de usuarios (`/api/users`) requiere rol `admin`, no existe una forma de crear
el primer usuario administrador a través de la API. En su lugar, el servidor revisa al arrancar
si ya existe algún usuario con rol `admin` y, si no hay ninguno, crea uno con los valores de
`ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` (por defecto `admin` / `admin@hotel.local` /
`admin123` si no se configuran). En producción no hay contraseña por defecto: si todavía no
existe ningún admin y falta `ADMIN_PASSWORD`, el servidor no arranca.

## Niveles de acceso

Hay tres niveles de acceso:

- **Huésped** (cualquier usuario autenticado): puede reservar para sí mismo, agregar servicios a
  su propia reserva, ver y cancelar sus propias reservas (`/api/*/mine`, `/api/guests/me`).
- **Empleado**: la operación diaria del hotel. Gestiona reservas de cualquier huésped,
  check-in/check-out y comprobantes, habitaciones, categorías, huéspedes, servicios, cupos,
  precios, reglas de tarifas dinámicas, consumos de servicios, provincias y ciudades.
- **Admin**: todo lo que puede hacer un empleado, más la gestión de usuarios y empleados
  (`/api/users`, `/api/employees`).

Los endpoints de sólo lectura necesarios para que un huésped explore el sitio sin sesión
(habitaciones, categorías, servicios, ciudades, provincias, cupos, precios vigentes y la cotización
de una estadía, `/api/pricing/quote`) son públicos.

Sin token, o con un token inválido, la API responde `401`. Con un token válido cuyo rol no
alcanza para esa ruta, responde `403`: la sesión sigue siendo válida, sólo no tiene permiso.

## Límite de peticiones

- Toda la API (`/api`): 600 peticiones por IP cada 15 minutos, ajustable con `RATE_LIMIT_MAX`.
- `POST /api/auth/login`: 20 intentos por IP cada 15 minutos.
- `POST /api/guests/register`: 10 altas por IP por hora.

Si la app corre detrás de un proxy inverso (nginx), `TRUST_PROXY`
indica cuántos proxies confiar. Sin eso, el límite agrupa a todos los usuarios bajo la IP del
proxy.

## Arquitectura

El backend está organizado en capas. Cada pedido HTTP las recorre en orden y cada capa sólo
conoce a la siguiente:

```
routes  →  controllers  →  services  →  repositories  →  entities  →  MySQL
```

| Capa | Responsabilidad |
|---|---|
| `routes/` | Asocia cada verbo + ruta con un controlador y con los middlewares que lo protegen (autenticación, rol, límite de peticiones). |
| `controllers/` | Sólo HTTP: lee la request (params, query, body), llama al servicio y arma la respuesta (status y JSON). No contiene reglas de negocio ni consultas. |
| `services/` | Las reglas de negocio: disponibilidad y solapamiento de fechas, transiciones de una reserva (`pendiente → check-in → check-out`, o `cancelada`), cálculo del precio, descuento de cupos. Lanzan errores de dominio (`NotFoundError`, `BadRequestError`...) sin saber nada de Express. |
| `repositories/` | Acceso a datos: la única capa que usa Sequelize. Todos implementan la interfaz `Repository<T>` de `base.repository.ts`; los servicios dependen de esa interfaz y no del ORM (inversión de dependencias). |
| `entities/` | Las entidades del dominio (modelos de Sequelize) y sus asociaciones. |

Los errores se convierten en respuestas en un único lugar, `middleware/error-handler.ts`, con la
forma `{ error, message?, details? }`: `message` explica el error al usuario y `details` es
información de depuración que nunca se envía en producción. Las operaciones que tocan varias
tablas (reservar, check-in/out, consumir un servicio) corren dentro de una transacción.

**Disponibilidad de habitaciones.** El check-out es hasta las 10:00 del último día y el check-in
desde las 15:00 del primer día, así que una estadía puede empezar el mismo día en que termina
otra en la misma habitación. Dos reservas se superponen sólo si cada una empieza antes de que
termine la otra (`inicioA < finB` y `finA > inicioB`). Como consecuencia, el check-in se rechaza
con "Habitación ocupada" mientras la reserva anterior de esa habitación siga sin hacer el
check-out: si no, el check-out tardío marcaría como disponible una habitación con alguien adentro.
Reservar bloquea la fila de la habitación (`SELECT ... FOR UPDATE`), así que dos pedidos
simultáneos para la misma habitación no pueden aprobarse los dos.

**Tarifas dinámicas (yield management).** El precio de una estadía se calcula noche por noche en
`services/pricing.service.ts`, cada vez que alguien consulta: parte del precio base de la
categoría y lo ajustan las reglas de la tabla `ReglasTarifa`, que el staff administra desde la API:

- **Ocupación**: porcentaje de habitaciones de *esa categoría* reservadas esa noche (una suite
  llena no encarece las estándar). Una noche cuenta para una reserva si `inicio ≤ noche < fin`.
- **Antelación**: días que faltan para el check-in, contados con la fecha de Argentina.

Cada regla es un peldaño `[desde, hasta)` (`hasta` vacío = sin tope) con un ajuste porcentual o
fijo por noche. Si aplican las dos, se aplica primero la de ocupación y sobre el resultado la de
antelación, así que los porcentajes se multiplican: +30 % y −10 % dan +17 %, no +20 %. Una regla de
la categoría tiene prioridad sobre una general, dos reglas del mismo tipo y alcance no pueden
superponer rangos, y ninguna combinación baja una noche de la mitad del precio base. La cuenta
en sí es una función pura (`services/pricing-calculator.ts`) con sus propios tests unitarios.

El huésped nunca manda el monto: al confirmar, el backend vuelve a cotizar con la habitación ya
bloqueada. El frontend manda el `expectedTotal` que le mostró; si el precio cambió mientras tanto
la respuesta es `409 "El precio cambió"` con el total nuevo, y no se reserva nada. Las reservas ya
hechas conservan su precio. El staff puede reservar con un monto acordado o dejarlo vacío para
aplicar la tarifa dinámica.

El código está en inglés y los textos que ve el usuario (mensajes de error, comprobante en PDF)
en español. Las tablas y columnas de la base conservan sus nombres originales: cada entidad
los mapea con `tableName` y `field`, así que el refactor no requirió migrar datos. Por el mismo
motivo, los valores guardados de los estados (`'pendiente'`, `'huesped'`, `'disponible'`...)
siguen en español; en el código se usan a través de constantes (`ReservationStatus.PENDING`).

## Estructura del proyecto

```
src/
├── config/        # conexión a la base de datos, JWT, alta del admin inicial
├── routes/        # endpoints por recurso (incluye /health)
├── controllers/   # capa HTTP
├── services/      # reglas de negocio (y el comprobante en PDF)
├── repositories/  # acceso a datos (Sequelize) y transacciones
├── entities/      # entidades del dominio y sus asociaciones
├── middleware/    # autenticación (JWT), límite de peticiones y manejo de errores
├── shared/        # errores de dominio y utilidades (fechas, parámetros HTTP)
├── scripts/       # carga de datos de ejemplo (npm run seed:*)
├── test/          # setup de tests, unitarios e integración
├── app.ts         # instancia de Express (sin levantar el servidor; usado también por los tests)
└── index.ts       # punto de entrada: conecta la DB, sincroniza el esquema y levanta el servidor
docs/
└── database/      # modelo de la base de datos (MySQL Workbench)
```

## Documentación de la API

Endpoints principales (todos bajo el prefijo `/api`):

| Recurso | Rutas |
|---|---|
| Auth | `POST /auth/login` |
| Habitaciones | `GET,POST /rooms` (filtros: `startDate`, `endDate`, `categoryId`, `people`), `GET,PUT,DELETE /rooms/:id` |
| Categorías de habitación | `GET,POST /room-categories`, `GET,PUT,DELETE /room-categories/:id` |
| Huéspedes | `POST /guests/register`, `GET /guests/me`, `GET /guests`, `GET,PUT,DELETE /guests/:id` |
| Reservas | `GET,POST,PUT,DELETE /reservations[/:id]`, `POST /reservations/:id/check-in`, `POST /reservations/:id/check-out` (devuelve el comprobante en PDF), `GET /reservations/:id/receipt`, `POST,GET /reservations/mine`, `POST /reservations/:id/cancel` |
| Servicios adicionales | `GET,POST,PUT,DELETE /amenities[/:id]`, `GET,POST,PUT,DELETE /amenity-quotas[/:id]`, `GET,POST,PUT,DELETE /amenity-prices[/:id]` (`?amenityId=&current=true` para el precio vigente), `GET,POST,PUT,DELETE /reservation-amenities[/:id]`, `POST /reservation-amenities/mine` |
| Tarifas | `GET /pricing/quote?startDate=&endDate=[&categoryId=]` (público: precio de la estadía noche por noche), `GET,POST,PUT,DELETE /pricing-rules[/:id]` (staff) |
| Ubicaciones | `GET,POST,PUT,DELETE /provinces[/:id]`, `GET,POST,PUT,DELETE /cities[/:id]` (`?provinceId=`) |
| Empleados | `GET,POST,PUT,DELETE /employees[/:id]` |
| Usuarios | `GET,POST,PUT,DELETE /users[/:id]` |

Las rutas que no figuran como públicas en [Niveles de acceso](#niveles-de-acceso) requieren el
header `Authorization: Bearer <token>` de una cuenta con el rol correspondiente: empleado o
admin para la operación del hotel, sólo admin para usuarios y empleados.
