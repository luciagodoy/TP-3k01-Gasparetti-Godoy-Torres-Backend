# Cómo correr el proyecto

Guía de comandos para levantar el sistema completo (backend + frontend) en local.
El proyecto son dos repos separados que corren en paralelo:

| Repo | Carpeta | Puerto |
|---|---|---|
| Backend (Express + TS + Sequelize) | `TP-3k01-Gasparetti-Godoy-Torres-Backend` | `3000` |
| Frontend (React + Vite) | `TP-3k01-Gasparetti-Godoy-Torres-Frontend` | `5173` |

Requisito: Node.js 18+.

## 1. Primera vez (setup)

### Backend

```bash
cd TP-3k01-Gasparetti-Godoy-Torres-Backend
npm install
cp .env.example .env
```

Editá `.env` con los datos de tu base MySQL (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, etc.)
y un `JWT_SECRET` propio. Si te conectás a un proveedor administrado con TLS (por ejemplo Aiven),
poné `DB_SSL=true` y `DB_CA_PATH` apuntando al certificado.

### Frontend

```bash
cd TP-3k01-Gasparetti-Godoy-Torres-Frontend
npm install
cp .env.example .env.local
```

Por defecto `VITE_API_URL` ya apunta a `http://localhost:3000/api`, que es donde corre el backend
de este mismo setup — normalmente no hace falta tocar `.env.local`.

## 2. Correr en desarrollo

Necesitás **dos terminales**, una por repo (el backend tiene que estar arriba para que el
frontend hable con datos reales en vez de su fallback mock — ver sección "Troubleshooting"):

```bash
# Terminal 1 — backend
cd TP-3k01-Gasparetti-Godoy-Torres-Backend
npm run dev
```

```bash
# Terminal 2 — frontend
cd TP-3k01-Gasparetti-Godoy-Torres-Frontend
npm run dev
```

- Backend: http://localhost:3000 (sincroniza el esquema de la DB automáticamente al arrancar)
- Frontend: http://localhost:5173

El backend crea una cuenta admin la primera vez que arranca (si no existe ninguna), con las
credenciales de `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` en tu `.env`
(por defecto `admin` / `admin@hotel.local` / `admin123`). Iniciá sesión con eso y cambiá la
contraseña antes de usar el sistema en serio.

## 3. Datos de prueba (seed)

Con el backend configurado (no hace falta que esté corriendo), desde `TP-3k01-Gasparetti-Godoy-Torres-Backend`:

```bash
npm run seed:ubicaciones    # carga provincias y ciudades de Argentina
npm run seed:habitaciones   # carga categorías de habitación (con fotos) + habitaciones de ejemplo
```

## 4. Tests

```bash
# Backend — corre contra SQLite en memoria, no toca la base real
cd TP-3k01-Gasparetti-Godoy-Torres-Backend
npm test              # una vez
npm run test:watch    # modo watch

# Frontend — unitarios/componentes (Vitest) y end-to-end (Playwright)
cd TP-3k01-Gasparetti-Godoy-Torres-Frontend
npm test              # unitarios, una vez
npm run test:watch    # unitarios, modo watch
npm run test:e2e      # e2e; levanta su propio servidor de dev automáticamente
```

## 5. Build de producción

```bash
# Backend
cd TP-3k01-Gasparetti-Godoy-Torres-Backend
npm run build   # compila TypeScript a dist/
npm start       # corre el build compilado

# Frontend
cd TP-3k01-Gasparetti-Godoy-Torres-Frontend
npm run build     # genera dist/
npm run preview   # sirve ese build localmente para probarlo
```

## 6. Otros comandos útiles

```bash
# Frontend — linter
cd TP-3k01-Gasparetti-Godoy-Torres-Frontend
npm run lint
```

## Troubleshooting

- **El buscador de habitaciones muestra categorías raras ("Standard", "Doble")**: el backend no
  está corriendo. El frontend (`src/services/api.js`) cae en silencio a datos mock hardcodeados
  cuando el `fetch` al backend falla, sin mostrar ningún error visible — es la señal de que hay
  que levantar el backend (`npm run dev` en ese repo).
- **Puerto 3000 u 5173 ocupado**: cambiá `PORT` en el `.env` del backend, o corré Vite con
  `npm run dev -- --port <otro>` en el frontend (y actualizá `VITE_API_URL`/`FRONTEND_URL` acorde).
- **Error de conexión a MySQL**: revisá `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` en `.env`, y si
  el proveedor exige TLS, `DB_SSL=true` + `DB_CA_PATH`.
