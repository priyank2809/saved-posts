# NOTES.md

## Setup

Two separate apps: `server/` (API) and `web/` (UI). Run them in two terminals.

```bash
# --- Terminal 1: API ---
cd server
npm install
npm run migrate      # creates SQLite schema at server/data/dev.db
npm run seed         # wipes + inserts seed data (2 courses, 4 users, 8 posts, a few pre-existing saves)
npm run start        # http://localhost:4000

# --- Terminal 2: Web ---
cd web
npm install
npm run dev            # http://localhost:5173

# --- Tests (from server/) ---
npm test                # vitest: 21 tests (pure unit tests + API/auth integration tests)
npm run typecheck       # tsc --noEmit, strict mode
```

The web app has a **user switcher** in the top bar (Alice/Bob/Carla/Mo) standing in for login, see "Where auth lives" below. Switch to Carla to see the 403 path in the UI (she isn't enrolled in anything), or to Mo to see the moderator's "remove post" action.

## Stack actually used vs. preferred

| Layer | Preferred | Used | Why |
|---|---|---|---|
| API | Elysia | **Hono** | Listed as an acceptable substitute; I've used it before and it kept the auth-middleware + typed-route pattern simple. |
| DB | Postgres + Drizzle | **SQLite + Drizzle** | Explicitly acceptable, avoids requiring Docker/Postgres for the reviewer. |
| Client state | TanStack Query v5 | **same** | as preferred |
| UI | Next.js App Router | **Vite + React 19** | Listed as acceptable; this is a single SPA with no need for SSR/routing, so Vite is less machinery for the same result. |
| Tests | Vitest | **same** | as preferred |

Two separate apps (`server/`, `web/`) rather than one Next.js app with route handlers mainly so the API is trivially portable off Node later, and so the "layers" in the architecture diagram map onto real folder boundaries instead of Next conventions.

## Key design decisions

**Schema shape (the interesting part).** `saves` has exactly one row per `(userId, postId)` pair, enforced by a unique index, ever, un-save doesn't delete it, it sets `active = 0`. Re-saving flips `active` back to `1` on the *same* row rather than inserting a new one. That single unique index is what makes "no duplicate active saves" a database-level guarantee rather than something the application layer has to remember to enforce. History (when something was first saved, when it was last toggled) survives every un-save/re-save cycle for free.

`posts.saves_count` is a denormalized counter, not a `COUNT(*)` computed per request. It's updated in the same SQLite transaction that flips a `saves` row, so it can never drift from the `saves` table. The trade-off: if I were adding a second write path to `saves` later (e.g. an admin bulk-import), I'd need to remember to keep the counter in sync there too, or move to a trigger. Noted as a "next day" item below.

**Where auth lives.** Entirely in `server/src/middleware/auth.ts`, applied once to `/api/*`. It reads `x-user-id` / `x-user-role` headers (the assessment's stubbed-auth allowance), resolves them against the `users` table, and attaches a typed `AuthedUser` to the request context. Every route downstream trusts *only* that context object, nothing re-reads headers. This is the one seam I'd replace with real session/JWT verification; nothing else in the app would need to change.

**Where authorization lives.** Course-membership and role checks are pure functions (`src/lib/authz.ts`, `src/lib/saveDecision.ts`) that take plain data in and return a decision out, no DB, no HTTP. Routes are thin: fetch the post, fetch enrollment, call the pure function, act on the result. This is what let me unit-test idempotency and 403 logic without spinning up SQLite (`tests/saveDecision.test.ts`, `tests/authz.test.ts`) and it's also just easier to reason about in the follow-up conversation than logic buried inside a route handler.

**Fetching `hasSaved` / `savesCount` efficiently.** `savesCount` is the denormalized column above, no query at all beyond the row itself. `hasSaved` for a *list* of posts is one query: `SELECT post_id FROM saves WHERE user_id = ? AND active = 1 AND post_id IN (...)`, turned into a `Set` and checked per post while serializing. No N+1 one query no matter how many posts are on the page.

**Pagination.** Plain offset/limit (`page`/`pageSize` query params), not keyset/cursor pagination. Simple to implement, explain, and test in the time box. Trade-off: offset pagination degrades on very large tables and can skip/duplicate a row if the underlying set changes between page loads (e.g. someone saves a post while you're on page 2). For a real production feed at scale I'd move to a keyset cursor on `(created_at, id)` noted below.

**Client cache consistency.** `useSaveMutation` (in `web/src/api/queries.ts`) does an optimistic update across every currently-loaded query under the `postKeys.all` prefix (any feed page, the saved list) so the bookmark toggle feels instant, rolls back on error, and then invalidates that same prefix on settle so the server's truth wins, which is specifically what makes a post disappear from the "Saved" list right after you un-save it, instead of only updating a boolean that's no longer visible anywhere.

**i18n.** `web/src/i18n/` — flat JSON catalogs (`en.json`, `hi.json`) plus a small provider. Plural strings use a `key.zero` / `key.one` / `key.other` convention; `tPlural()` special-cases `count === 0` (for "No saves") and otherwise asks `Intl.PluralRules(locale).select(count)` for the CLDR category before falling back to `.other`. I used `Intl.PluralRules` rather than hand-rolling `count === 1 ? ... : ...` specifically because Hindi's plural rule differs from English's (0 *and* 1 both fall in Hindi's "one" bucket) the English-shaped ternary would silently mispluralize a second locale, which is exactly the bug this requirement is checking for.

## Trade-offs

- **Migrations are one hand-written SQL block**, not drizzle-kit generated migration files. Fine for a from-scratch schema with no prior versions; would switch to `drizzle-kit generate` once there's a second migration to reconcile.
- **No refresh-token/session auth**  headers only, per the brief's explicit allowance.
- **Offset pagination**, not keyset  see above.
- **No optimistic-concurrency/version column** on `saves`  SQLite's single-writer transaction is enough to make the save/un-save toggle correct under the concurrency this app actually sees (see "Concurrency" below), but it wouldn't be enough on Postgres under real concurrent load without the transaction+unique-index combo doing the same job there.
- **No comments/likes/views**, despite being mentioned in the product blurb,  out of scope for "Saved Posts," said so up front.
- **Moderator "remove post" is a hard delete** (removes the post and its save rows), not a soft delete with a `removedAt` column. The brief doesn't specify, and a hard delete was faster to reason about and test; a real product would almost certainly want the soft-delete version so students don't see a saved post silently vanish without explanation.
- **No dedicated `/api/users/me` endpoint**  the UI's user switcher is a client-side stand-in for login (see `web/src/context/CurrentUserContext.tsx`), not something a real app would ship.

## What I'd do next with another day

1. Catch-and-retry (or upsert) the save race above.
2. Keyset pagination on `(created_at, id)` for the feed and `(updated_at, id)` for the saved list.
3. Soft-delete for moderator post removal, with the UI explaining why a post disappeared from someone's saved list.
4. A real integration test against Postgres (via `drizzle-kit` + testcontainers).
5. Rate limiting on `/api/posts/:id/save`  right now nothing stops a client from hammering it.
