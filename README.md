# Community Forum — Saved Posts

- `server/` — Hono + TypeScript API, SQLite via Drizzle ORM
- `web/` — React 19 + Vite + TanStack Query

## Prerequisites

- [Node.js](https://nodejs.org) 20+ (tested on Node 22). Check with `node -v`.
- No Docker, no Postgres install needed — everything runs on SQLite in a local file.

## Quick start (two terminals)

### Terminal 1 — API

```bash
cd server
npm install
npm run migrate    # creates the SQLite schema (server/data/dev.db)
npm run seed       # wipes and re-inserts seed data, safe to re-run anytime
npm run start      # starts the API on http://localhost:4000
```

### Terminal 2 — Web UI

```bash
cd web
npm install
npm run dev           # starts the UI on http://localhost:5173
```

Open **http://localhost:5173**. Use the "Viewing as" dropdown in the top bar to switch
between the seeded users (auth is stubbed via headers per the assessment brief, see
`server/src/middleware/auth.ts`):

| User | Role | Enrolled in |
|---|---|---|
| Alice Chen | student | CS101, WEB201 |
| Bob Singh | student | CS101 only |
| Carla Diaz | student | nothing (try her to see the 403 path) |
| Mo Reyes | moderator | sees every course, can remove posts |

## Running tests

```bash
cd server
npm test              # 21 tests: pure unit tests (save/un-save idempotency, authz)
                      # + API integration tests (401/403/404 boundaries, happy path)
npm run typecheck     # tsc --noEmit, strict mode
```

The `web/` app doesn't have its own test suite (all business logic lives server-side);
`npm run build` in `web/` runs `tsc -b` first,
so a type error there fails the build.

## If something doesn't start

- **Port already in use**: set `PORT=4001 npm run start` in `server/`, and update
  `web/.env` (`VITE_API_URL=http://localhost:4001`) to match.
- **"Cannot open database"**: delete `server/data/` and re-run `npm run migrate && npm run seed`.
- Everything is a fresh `npm install` away from a clean state, nothing is installed globally.
