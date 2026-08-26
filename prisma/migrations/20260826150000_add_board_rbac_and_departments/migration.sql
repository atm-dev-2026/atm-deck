-- AlterTable: add new Board columns. ownerId is added nullable first so it can be
-- backfilled for pre-existing rows, then tightened to NOT NULL below.
ALTER TABLE `Board` ADD COLUMN `departmentId` VARCHAR(191) NULL,
    ADD COLUMN `ownerId` VARCHAR(191) NULL,
    ADD COLUMN `visibilityType` ENUM('GLOBAL', 'DEPARTMENT', 'PERSONAL') NOT NULL DEFAULT 'PERSONAL';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `globalRole` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE `BoardMember` (
    `id` VARCHAR(191) NOT NULL,
    `boardId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('READ_ONLY', 'CAN_EDIT') NOT NULL DEFAULT 'READ_ONLY',
    `invitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BoardMember_userId_idx`(`userId`),
    UNIQUE INDEX `BoardMember_boardId_userId_key`(`boardId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DepartmentMember` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('MANAGER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DepartmentMember_userId_idx`(`userId`),
    UNIQUE INDEX `DepartmentMember_departmentId_userId_key`(`departmentId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill pre-existing Board rows (predate ownership/visibility): assign them to
-- user `cmt9qw3d6000004jobjrh3p6t` (Friend. / friendlysripa@gmail.com) and mark them
-- GLOBAL so every existing user keeps read access, matching pre-RBAC behavior.
UPDATE `Board` SET `ownerId` = 'cmt9qw3d6000004jobjrh3p6t', `visibilityType` = 'GLOBAL'
    WHERE `ownerId` IS NULL;

-- Now that every row has an owner, enforce NOT NULL going forward.
ALTER TABLE `Board` MODIFY COLUMN `ownerId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Board_ownerId_idx` ON `Board`(`ownerId`);

-- CreateIndex
CREATE INDEX `Board_visibilityType_departmentId_idx` ON `Board`(`visibilityType`, `departmentId`);

-- AddForeignKey
ALTER TABLE `Board` ADD CONSTRAINT `Board_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Board` ADD CONSTRAINT `Board_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentMember` ADD CONSTRAINT `DepartmentMember_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepartmentMember` ADD CONSTRAINT `DepartmentMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
