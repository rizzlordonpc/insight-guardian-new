# Insight Guardian — Backend

Insider-threat detection and behavioural-analytics API for the Insight Guardian SOC dashboard.
Built with **Express + Prisma + PostgreSQL + Redis + Socket.io**.

## Architecture Overview

The backend is a Node.js/TypeScript Express server that exposes a RESTful JSON API for managing monitored users, security alerts, decoy honeypot assets, and access-event simulation, with real-time updates delivered over Socket.io.
Business logic lives in service modules (`src/services/`), Prisma handles the PostgreSQL schema and data access layer, and Redis backs rate limiting and real-time pub/sub.
Security is enforced through JWT-based authentication, role-based authorization (Administrator / Analyst), Helmet HTTP headers, input sanitisation, per-route rate limiting, and a full HTTP audit log.

---

## Prerequisites

| Dependency    | Minimum version |
|---------------|-----------------|
| Node.js       | 20+             |
| PostgreSQL    | 15+             |
| Redis         | 7+              |
| npm           | 10+             |

---

## Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd insight-guardian-main/backend

# 2. Install dependencies
npm install

# 3. Create .env from the example and fill in values
cp .env.example .env

# 4. Run database migrations
npm run db:migrate

# 5. Seed the database with demo data
npm run db:seed

# 6. Start the development server
npm run dev
```

---

## Environment Variables

| Variable               | Type     | Required | Example / Default                                          | Description                                                   |
|------------------------|----------|----------|------------------------------------------------------------|---------------------------------------------------------------|
| `DATABASE_URL`         | `string` | ✅        | `postgresql://postgres:postgres@localhost:5432/insight_guardian?schema=public` | PostgreSQL connection string (Prisma)                         |
| `REDIS_URL`            | `string` | ✅        | `redis://localhost:6379`                                   | Redis connection string for rate limiting, sessions, pub/sub  |
| `JWT_SECRET`           | `string` | ✅        | `change-me-access-token-secret-min-32-chars`               | HMAC secret for signing access tokens (min 32 chars in prod)  |
| `JWT_REFRESH_SECRET`   | `string` | ✅        | `change-me-refresh-token-secret-min-32-chars`              | HMAC secret for signing refresh tokens (min 32 chars in prod) |
| `JWT_EXPIRES_IN`       | `string` | ✅        | `15m`                                                      | Access token lifetime (`ms`-compatible duration string)       |
| `JWT_REFRESH_EXPIRES_IN` | `string` | ✅      | `7d`                                                       | Refresh token lifetime                                        |
| `PORT`                 | `number` | ❌        | `3001`                                                     | HTTP listen port                                              |
| `NODE_ENV`             | `string` | ❌        | `development`                                              | `development` / `production` / `test`                         |
| `FRONTEND_URL`         | `string` | ✅        | `http://localhost:5173`                                    | Allowed CORS origin (Vite dev server URL)                     |

---

## API Endpoint Reference

All routes are prefixed with `/api`. Responses follow the envelope `{ success: boolean, error?: string, ...data }`.

### Auth (`/api/auth`)

| Method | Path                  | Auth | Role | Description                            |
|--------|-----------------------|------|------|----------------------------------------|
| POST   | `/api/auth/login`     | ❌    | —    | Authenticate and receive JWT tokens    |
| POST   | `/api/auth/refresh`   | ❌    | —    | Refresh an expired access token        |
| POST   | `/api/auth/logout`    | ✅    | Any  | Invalidate refresh token               |
| GET    | `/api/auth/me`        | ✅    | Any  | Get current authenticated operator     |

### Users (`/api/users`)

| Method | Path                        | Auth | Role          | Description                                  |
|--------|-----------------------------|------|---------------|----------------------------------------------|
| GET    | `/api/users`                | ✅    | Any           | List monitored users (filter, sort)          |
| POST   | `/api/users`                | ✅    | Administrator | Create a new monitored user                  |
| GET    | `/api/users/:id`            | ✅    | Any           | Get user details + activity + alerts         |
| PATCH  | `/api/users/:id/restrict`   | ✅    | Administrator | Restrict (freeze) a monitored user           |
| PATCH  | `/api/users/:id/restore`    | ✅    | Administrator | Restore a previously restricted user         |

### Alerts (`/api/alerts`)

| Method | Path                       | Auth | Role          | Description                                |
|--------|----------------------------|------|---------------|--------------------------------------------|
| GET    | `/api/alerts`              | ✅    | Any           | List alerts (filter by severity/status/user)|
| PATCH  | `/api/alerts/:id/status`   | ✅    | Administrator | Update alert status                        |

### Decoys (`/api/decoys`)

| Method | Path                           | Auth | Role          | Description                          |
|--------|--------------------------------|------|---------------|--------------------------------------|
| GET    | `/api/decoys`                  | ✅    | Any           | List decoy honeypot assets           |
| POST   | `/api/decoys`                  | ✅    | Administrator | Deploy a new decoy asset             |
| PATCH  | `/api/decoys/:id/deactivate`   | ✅    | Administrator | Deactivate a decoy asset             |

### Events (`/api/events`)

| Method | Path                    | Auth | Role          | Description                                         |
|--------|-------------------------|------|---------------|-----------------------------------------------------|
| GET    | `/api/events`           | ✅    | Any           | List access events (filter by user/type/risk)       |
| POST   | `/api/events/simulate`  | ✅    | Administrator | Simulate a user access event (triggers risk engine) |

### Dashboard (`/api/dashboard`)

| Method | Path                        | Auth | Role | Description                                      |
|--------|-----------------------------|------|------|--------------------------------------------------|
| GET    | `/api/dashboard/stats`      | ✅    | Any  | Aggregated dashboard statistics                  |
| GET    | `/api/dashboard/timeseries` | ✅    | Any  | Alert counts by day, grouped by severity         |
| GET    | `/api/dashboard/hourly`     | ✅    | Any  | Hourly access-event activity distribution        |

---

## Socket.io Event Reference

Clients must connect with a JWT access token in the handshake:

```ts
import { io } from 'socket.io-client';

const socket = io(API_ORIGIN, {
  withCredentials: true,
  auth: { token: accessToken },
});
```

Unauthorized handshakes are rejected; the server does not accept anonymous socket connections.

### Server → Client (broadcast)

All events are emitted to **all** connected clients (`io.emit`).

| Event              | Payload shape                                                                                             | Emitted by                               |
|--------------------|-----------------------------------------------------------------------------------------------------------|------------------------------------------|
| `user:riskUpdated` | `{ id: string; name: string; riskScore: number; riskTrend: RiskTrend; status: MonitoredUserStatus }`      | `eventService.simulateAccessEvent`       |
| `user:restricted`  | `{ id: string; name: string; status: MonitoredUserStatus }`                                               | `userService.restrictUser`               |
| `user:restored`    | `{ id: string; name: string; status: MonitoredUserStatus }`                                               | `userService.restoreUser`                |
| `event:new`        | Full `AccessEvent` model (see Prisma schema)                                                              | `eventService.simulateAccessEvent`       |
| `alert:new`        | Full `Alert` model (see Prisma schema)                                                                    | `eventService.simulateAccessEvent`       |
| `alert:updated`    | `{ id: string; status: AlertStatus }`                                                                     | `alertService.updateAlertStatus`         |
| `decoy:deployed`   | Full `DecoyAsset` model (see Prisma schema)                                                               | `decoyService.createDecoy`               |
| `decoy:hit`        | `{ decoyId: string; decoyName: string; userId: string; userName: string; riskDelta: number }`             | `eventService.simulateAccessEvent`       |

### Client → Server

No custom client events are required for the current contract. Optional pings/presence can be added later.

---

## How to Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

The test suite uses [Vitest](https://vitest.dev/). Tests are co-located next to the modules they cover (e.g. `src/engine/eventEngine.test.ts`).

---

## Scripts Reference

| Script            | Command                                            | Description                              |
|-------------------|-----------------------------------------------------|------------------------------------------|
| `dev`             | `ts-node-dev --respawn --transpile-only src/server.ts` | Start dev server with hot-reload         |
| `build`           | `tsc`                                               | Compile TypeScript to `dist/`            |
| `start`           | `node dist/server.js`                                | Run production build                     |
| `db:migrate`      | `prisma migrate dev`                                 | Apply Prisma migrations                  |
| `db:seed`         | `ts-node prisma/seed.ts`                             | Seed database with demo data             |
| `test`            | `vitest run`                                         | Run tests once                           |
| `test:watch`      | `vitest`                                             | Run tests in watch mode                  |
| `postinstall`     | `prisma generate`                                    | Regenerate Prisma client after install   |
