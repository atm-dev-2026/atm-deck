-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "canManageUsers" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AppInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "AppInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppInvite_tokenHash_key" ON "AppInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "AppInvite_createdAt_idx" ON "AppInvite"("createdAt");

-- AddForeignKey
ALTER TABLE "AppInvite" ADD CONSTRAINT "AppInvite_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInvite" ADD CONSTRAINT "AppInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInvite" ADD CONSTRAINT "AppInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the roles that may manage users. Department.name isn't unique, so
-- find-or-create by name, then flag any pre-existing rows with those names.
INSERT INTO "Department" ("id", "name", "canManageUsers", "createdAt")
SELECT gen_random_uuid()::text, n, true, CURRENT_TIMESTAMP
FROM unnest(ARRAY['CEO', 'IT Support', 'HR IS', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร']) AS n
WHERE NOT EXISTS (SELECT 1 FROM "Department" d WHERE d."name" = n);

UPDATE "Department" SET "canManageUsers" = true
WHERE "name" IN ('CEO', 'IT Support', 'HR IS', 'ผู้ดูแลระบบ', 'ฝ่ายบริหาร');
