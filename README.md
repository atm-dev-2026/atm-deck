# ATM Deck

Internal taskboard for ATM Holding — boards, columns, and tasks, Trello-style.

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS)
- Prisma 7 ORM with the MySQL/MariaDB driver adapter (`@prisma/adapter-mariadb`)

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your MySQL connection string.
2. Install dependencies: `npm install`
3. Apply the schema to the database: `npx prisma migrate dev --name init`
4. Run the app: `npm run dev`

## Data model

- **Board** has many **Columns**
- **Column** has many **Tasks**, ordered by `order`
- Tasks move between columns and reorder via `PATCH /api/tasks/[taskId]`

## Deployment

This project targets a cloud-hosted MySQL database (no local MySQL dependency). Point
`DATABASE_URL` at the cloud database and run `npx prisma migrate deploy` as part of
the deploy step.
