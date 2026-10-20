# Task Manager

Task Manager is a React/Vite frontend backed by an Express API, PostgreSQL, and Passport sessions.

## Requirements

- Node.js 20.19+ or 22.12+
- A reachable PostgreSQL database

## Database setup

For a new database, run [`BackEnd/schema.sql`](./BackEnd/schema.sql) with a database role that can create tables. The application creates its PostgreSQL session table at startup. Existing databases should provide the same `users`, `teams`, and `tasks` columns defined in that schema.

## Environment

Configure `BackEnd/.env` with:

```env
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SESSION_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:5173
```

`DATABASE_SSL` defaults to enabled; set it to `false` only for a local database that does not use TLS. For a frontend served from a different origin, set `FRONTEND_URL` to its origin (or a comma-separated list of allowed origins). Keep environment files private.

For local development, the frontend proxies API requests to `http://localhost:5000`. To use another API server, set `VITE_API_PROXY_TARGET` in the frontend environment. For a separately hosted frontend/API pair, set `VITE_API_BASE_URL` to the API's base URL and configure `FRONTEND_URL` on the backend. If the frontend and API are on different sites, also set `SESSION_COOKIE_SAME_SITE=none` and run the backend over HTTPS (`NODE_ENV=production`).

## Run locally

In one terminal:

```powershell
cd BackEnd
npm install
npm run dev
```

When PostgreSQL is unreachable during `npm run dev`, the backend uses Express's in-memory session store so local session behavior can still be exercised. These sessions are temporary and disappear when the server restarts. This does not replace PostgreSQL for user, team, or task data. Production startup requires a reachable PostgreSQL database and always uses PostgreSQL-backed sessions.

In a second terminal:

```powershell
cd FrontEnd
npm install
npm run dev
```

Open the Vite URL shown in the frontend terminal. Register, sign in, create a team, then create and update tasks. The backend `/health` endpoint checks both the process and its database connection; `/test-db` gives the database connection result.

If registration reports that the database cannot be reached, verify that `DATABASE_URL` in `BackEnd/.env` matches the active database's connection string and that its hostname resolves from your machine. For Supabase, copy the current PostgreSQL connection string from the project's database settings. If the database is new, run `BackEnd/schema.sql` first. Restart the backend after changing environment settings.

## Checks

```powershell
cd FrontEnd
npm run lint
npm run build
```

The backend can be syntax-checked with `node --check` for its server, routes, models, and Passport configuration.
