-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('BOARD', 'COLUMN', 'TASK', 'LABEL', 'BOARD_MEMBER');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'INVITED', 'ROLE_CHANGED', 'REMOVED');

-- DropIndex
DROP INDEX "Board_ownerId_idx";

-- DropIndex
DROP INDEX "Board_visibilityType_departmentId_idx";

-- DropIndex
DROP INDEX "BoardMember_userId_idx";

-- DropIndex
DROP INDEX "ChecklistItem_taskId_idx";

-- DropIndex
DROP INDEX "Column_boardId_idx";

-- DropIndex
DROP INDEX "Label_boardId_idx";

-- DropIndex
DROP INDEX "Task_assigneeId_idx";

-- DropIndex
DROP INDEX "Task_columnId_idx";

-- DropIndex
DROP INDEX "TaskAttachment_taskId_idx";

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BoardMember" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Label" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskAttachment" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "entityType" "ActivityEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_boardId_createdAt_idx" ON "ActivityLog"("boardId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Board_ownerId_deletedAt_idx" ON "Board"("ownerId", "deletedAt");

-- CreateIndex
CREATE INDEX "Board_visibilityType_departmentId_deletedAt_idx" ON "Board"("visibilityType", "departmentId", "deletedAt");

-- CreateIndex
CREATE INDEX "BoardMember_userId_deletedAt_idx" ON "BoardMember"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "ChecklistItem_taskId_deletedAt_idx" ON "ChecklistItem"("taskId", "deletedAt");

-- CreateIndex
CREATE INDEX "Column_boardId_deletedAt_idx" ON "Column"("boardId", "deletedAt");

-- CreateIndex
CREATE INDEX "Label_boardId_deletedAt_idx" ON "Label"("boardId", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_columnId_deletedAt_idx" ON "Task"("columnId", "deletedAt");

-- CreateIndex
CREATE INDEX "Task_assigneeId_deletedAt_idx" ON "Task"("assigneeId", "deletedAt");

-- CreateIndex
CREATE INDEX "TaskAttachment_taskId_deletedAt_idx" ON "TaskAttachment"("taskId", "deletedAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
