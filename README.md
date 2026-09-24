# ATM Deck

Internal taskboard for ATM Holding — boards, columns, and tasks, Trello-style.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Prisma 7 ORM with the Postgres driver adapter (`@prisma/adapter-pg`)
- Auth.js v5 (Google + LINE sign-in, database session strategy via the Prisma adapter)

## Local setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — your Postgres connection string (e.g. from Prisma Postgres, Neon, Supabase, or a local Postgres instance)
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from Google Cloud Console (OAuth client, add
     `<origin>/api/auth/callback/google` as an authorized redirect URI)
   - `AUTH_LINE_ID` / `AUTH_LINE_SECRET` — from the LINE Developers console (add
     `<origin>/api/auth/callback/line` as a callback URL)
2. Install dependencies: `npm install`
3. Apply the schema to the database: `npx prisma migrate deploy` (or `npx prisma migrate dev` while iterating on the schema)
4. Run the app: `npm run dev`

Any signed-in Google or LINE account can access the board — there's no allowlist.

## Data model

- **Board** has many **Columns**
- **Column** has many **Tasks**, ordered by `order`
- Tasks move between columns via `PATCH /api/tasks/[taskId]`; boards and columns cascade-delete their children

## Features

- Create and delete boards
- Add, rename (via delete + re-add), and delete columns
- Add tasks, move them between columns, and delete them
- Click a task to edit its title, description, assignee, and due date

## Deployment

This project targets a cloud-hosted Postgres database (no local Postgres dependency). Point
`DATABASE_URL` at the cloud database and run `npx prisma migrate deploy` as part of
the deploy step.
