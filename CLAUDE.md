# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (this also rewrites the AGENTS.md block above; keep it if it reappears)
- `npm run build` — `prisma generate && next build`
- `npm run lint` — ESLint (flat config via `eslint-config-next`)
- `npm test` — run the full Vitest suite once; `npm run test:watch` for watch mode
- Single test file: `npx vitest run tests/boards.members.test.ts`
- Single test case: `npx vitest run tests/boards.members.test.ts -t "owner removes a member"`
- `npm run db:seed` — `tsx prisma/seed.ts`
- After editing `prisma/schema.prisma`: `npx prisma migrate dev --name <desc>` (local) or `npx prisma migrate deploy` (deploy step)

### Tests hit a real database
Vitest is *not* mocking Prisma — `tests/setup.ts` loads `.env.test` (falls back to `.env` with a warning if absent), so create a dedicated `.env.test` pointing at a disposable Postgres database before running `npm test`. Only `@/lib/auth`'s `auth()` is mocked (`vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))` + `mockSessionAs()` from `tests/helpers/fixtures.ts`); permission logic and Prisma queries run for real against that DB. Fixture helpers (`createUser`, `createBoard`, etc.) track what they insert and `cleanupFixtures()` deletes only those rows — the DB is never assumed to start empty, and routes are invoked directly via `callRoute(handler, { method, body, params })` rather than over HTTP.

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Prisma 7 against Postgres (Prisma Postgres) via the `@prisma/adapter-pg` driver adapter, Auth.js v5 beta (Google + LINE, database sessions), Tailwind CSS v4. Single app, no monorepo.

Two version-specific conventions this repo already follows correctly (see `AGENTS.md` — don't "fix" either back to the old convention):
- **`middleware.ts` → `proxy.ts`**: `src/proxy.ts` is the route-protection gate (default-exports the auth check, redirects unauthenticated requests to `/login`). A file named `middleware.ts` will not run in this Next.js version.
- **Prisma config filename is `prisma7.config.ts`**, not `prisma.config.ts` — this installed Prisma version auto-discovers `prisma7.config.*` first and treats `prisma.config.*` as a legacy fallback name.

### Auth
- `auth.ts` (repo root) is the real Auth.js config — providers, Prisma adapter, `session: { strategy: "database" }`. Consumed by `src/app/api/auth/[...nextauth]/route.ts` and `src/proxy.ts`.
- `src/lib/auth.ts` just re-exports that `auth` under the `@/` alias, purely so tests can `vi.mock("@/lib/auth")` without touching the real config.
- `src/lib/current-user.ts`'s `getCurrentUser()` is what routes/pages actually call: resolves the Auth.js session, then loads the `User` row (`godMode`, `departmentMemberships` + their department flags) via Prisma. Prefer it over calling `auth()` directly whenever you need role/membership data.

### Authorization (`src/lib/permissions.ts`)
Two independent role axes combine into per-board access:
- **God mode** (`User.godMode`) — a self-service superuser switch that bypasses every other check. It only takes effect while the user's department has `canUseGodMode` (`CurrentUser.godMode` is already that effective value).
- **Department role** (`DepartmentMember.role`: `MANAGER`/`MEMBER`) — grants edit on `DEPARTMENT`-visibility boards only.
- **Board** has `visibilityType` (`GLOBAL`/`DEPARTMENT`/`PERSONAL`), an `ownerId`, and direct `BoardMember` invites (`READ_ONLY`/`CAN_EDIT`) that apply regardless of visibility.

**App access (role = department)**: every user must belong to exactly one `Department` — that is their app "role". `getCurrentUser()` returns `null` for role-less users, so every route/page gating on it locks them out (they land on `/no-access`); `getSessionUser()` is the raw lookup reserved for login, `/no-access`, `/invite/[token]` and `POST /api/invites/accept`. "Exactly one" is enforced in code (`assignRole()` in `src/lib/roles.ts` replaces memberships in a transaction), not by a DB constraint. Departments flagged `canManageUsers` (seeded: CEO, IT Support, HR IS, ผู้ดูแลระบบ, ฝ่ายบริหาร) get `CurrentUser.canManageUsers` → `/member` and `requireUserManager()`. `AppInvite` links are single-use (atomic conditional `updateMany` claim), expire after 10 minutes, and store only a sha256 of the token. Departments flagged `canUseGodMode` (seeded: ผู้ดูแลระบบ, CEO, IT Support, ฝ่ายบริหาร) let members switch god mode on/off for themselves via `POST /api/god-mode`, which takes no target user — nobody can flip someone else's switch. Every change goes through `setOwnGodMode()` in `src/lib/roles.ts`, which writes a `GodModeLog` row. Role changes (`assignRole()`, access removal) never touch the switch; they neutralize it because god mode only takes effect while the role allows it. Test fixtures' `createUser()` gives users a role by default; pass `{ withRole: false }` for a role-less one or `{ godMode: true }` for one in god mode.

`resolveBoardAccess()` is the single source of truth for precedence: god mode > owner > direct invite (any visibility) > department role (DEPARTMENT boards only) > GLOBAL default read-only. Capability flags (`canEdit`/`canDelete`/`canManageMembers`) are independent, not a ladder — e.g. a `CAN_EDIT` invitee or a department `MANAGER` can edit but never delete or manage members; only `OWNER`/`GOD_MODE` get those. Route handlers gate access with `requireBoardAccess(boardId, { minEdit, minDelete, minManageMembers })`, `requireUserManager()` or `requireGodMode()`, all returning a discriminated `{ error } | { user, ... }` result. Resolving a resource's owning board for these checks goes through the `getBoardIdFor*()` helpers in the same file (for columns/tasks/checklist items/labels) rather than walking relations ad hoc.

### Data model (`prisma/schema.prisma`)
The Prisma client is generated **into the repo** at `src/generated/prisma` (gitignored, regenerated by `prisma generate`/`postinstall`) — import types from `@/generated/prisma/client`, never `@prisma/client`. Two domains share one `User`:
- **Boards**: `Board` → `Column` → `Task` (position via an `order` int; reordering/moving is `PATCH /api/tasks/[taskId]`) → `Label`s and `ChecklistItem`s.
- **Chat**: `Channel` → `Message` (self-referencing `parentId` for threads) → `Reaction`s and `Attachment`s; `TypingIndicator` is a short-lived per-channel-per-user row for the "is typing" UI.

### Chat delivery is polling-based SSE, not WebSockets
`src/app/api/channels/[channelId]/stream/route.ts` opens a `ReadableStream` (`text/event-stream`) that polls Prisma every 2s for messages/typing-indicators updated since a cursor, and self-closes after ~50s expecting the client to reconnect — there is no WebSocket server or pub/sub layer anywhere in the app. `src/lib/chat.ts` (`messageInclude`, `serializeMessage`) is shared between this stream and the regular REST message endpoints to keep payload shape and reaction-grouping consistent; touch both when changing what a message serializes to.

### Attachments (Cloudflare R2)
`src/lib/r2.ts` sets up an S3-compatible client against R2 (path-style addressing, checksum behaviors disabled — R2-specific workarounds, see comments in that file). Uploads/downloads go through presigned URLs (`@aws-sdk/s3-request-presigner`). Required env vars — `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — are *not* listed in `.env.example`; add them locally before working on attachment code.

### API routes
Plain REST under `src/app/api/**`, one `route.ts` per resource. Dynamic segments use the async `params` shape (`{ params }: { params: Promise<{ id: string }> }`). The common pattern in a mutating handler: resolve the owning board with a `getBoardIdFor*()` helper, gate with `requireBoardAccess`/`requireUserManager`/`requireGodMode`, then run the Prisma call in a try/catch with `handleRouteError` (`src/lib/apiError.ts`) as the catch-all 500.
