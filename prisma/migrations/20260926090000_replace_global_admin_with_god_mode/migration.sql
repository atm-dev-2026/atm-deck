-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "canUseGodMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "godMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GodModeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GodModeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GodModeLog_createdAt_idx" ON "GodModeLog"("createdAt");

-- AddForeignKey
ALTER TABLE "GodModeLog" ADD CONSTRAINT "GodModeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Roles whose members may switch god mode on.
UPDATE "Department" SET "canUseGodMode" = true
WHERE "name" IN ('ผู้ดูแลระบบ', 'CEO', 'IT Support', 'ฝ่ายบริหาร');

-- Global ADMIN is replaced by god mode. Role-less admins relied on ADMIN alone
-- to get in, so give them the ผู้ดูแลระบบ role (god mode starts off).
INSERT INTO "DepartmentMember" ("id", "departmentId", "userId", "role", "joinedAt")
SELECT gen_random_uuid()::text,
       (SELECT d."id" FROM "Department" d WHERE d."name" = 'ผู้ดูแลระบบ' ORDER BY d."createdAt" LIMIT 1),
       u."id", 'MEMBER', CURRENT_TIMESTAMP
FROM "User" u
WHERE u."globalRole" = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM "DepartmentMember" m WHERE m."userId" = u."id")
  AND EXISTS (SELECT 1 FROM "Department" d WHERE d."name" = 'ผู้ดูแลระบบ');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "globalRole";

-- DropEnum
DROP TYPE "GlobalRole";
