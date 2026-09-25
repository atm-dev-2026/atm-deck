-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "isDone" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing columns that are clearly "done" columns by name (the
-- default "Done" column every board is created with, and Thai equivalents).
UPDATE "Column" SET "isDone" = true WHERE lower(btrim("name")) IN ('done', 'เสร็จ', 'เสร็จแล้ว');
