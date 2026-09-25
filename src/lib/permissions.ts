import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import type { BoardRole, BoardVisibility, Prisma } from "@/generated/prisma/client";

export type BoardAccess = {
  role: "ADMIN" | "OWNER" | "DEPT_MANAGER" | "DEPT_MEMBER" | "VIEWER" | BoardRole;
  canView: true;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
};

type BoardForAccessCheck = {
  ownerId: string;
  visibilityType: BoardVisibility;
  departmentId: string | null;
  // Must already be filtered to (at most) the current user's own membership row.
  members: { role: BoardRole }[];
};

/**
 * Access precedence: global admin > owner > direct invite (any visibility,
 * including PERSONAL) > department role (DEPARTMENT boards only) > GLOBAL
 * default read-only. Capability flags are independent, not an ordinal ladder:
 * a CAN_EDIT invitee or department MANAGER can edit but never delete or
 * manage members — only OWNER/ADMIN get those.
 */
export function resolveBoardAccess(
  user: CurrentUser | null,
  board: BoardForAccessCheck,
): BoardAccess | null {
  if (!user) return null;

  if (user.globalRole === "ADMIN") {
    return { role: "ADMIN", canView: true, canEdit: true, canDelete: true, canManageMembers: true };
  }

  if (board.ownerId === user.id) {
    return { role: "OWNER", canView: true, canEdit: true, canDelete: true, canManageMembers: true };
  }

  const membership = board.members[0];
  if (membership) {
    return {
      role: membership.role,
      canView: true,
      canEdit: membership.role === "CAN_EDIT",
      canDelete: false,
      canManageMembers: false,
    };
  }

  if (board.visibilityType === "DEPARTMENT" && board.departmentId) {
    const deptMembership = user.departmentMemberships.find(
      (d) => d.departmentId === board.departmentId,
    );
    if (deptMembership) {
      const canEdit = deptMembership.role === "MANAGER";
      return {
        role: canEdit ? "DEPT_MANAGER" : "DEPT_MEMBER",
        canView: true,
        canEdit,
        canDelete: false,
        canManageMembers: false,
      };
    }
  }

  if (board.visibilityType === "GLOBAL") {
    return { role: "VIEWER", canView: true, canEdit: false, canDelete: false, canManageMembers: false };
  }

  return null;
}

/**
 * Validates a (visibilityType, departmentId) pair for a board create/update.
 * DEPARTMENT boards require a departmentId the user belongs to (or global admin);
 * any other visibility forces departmentId to null.
 */
export function validateBoardVisibility(
  user: CurrentUser,
  visibilityType: BoardVisibility,
  departmentId: string | null | undefined,
): { ok: true; departmentId: string | null } | { ok: false; status: number; error: string } {
  if (visibilityType !== "DEPARTMENT") {
    return { ok: true, departmentId: null };
  }

  if (!departmentId || typeof departmentId !== "string") {
    return { ok: false, status: 400, error: "บอร์ดประเภทแผนกต้องระบุแผนก" };
  }
  const isMember = user.departmentMemberships.some((d) => d.departmentId === departmentId);
  if (user.globalRole !== "ADMIN" && !isMember) {
    return {
      ok: false,
      status: 403,
      error: "ต้องเป็นสมาชิกของแผนกนี้ก่อนถึงจะสร้างบอร์ดให้แผนกนี้ได้",
    };
  }
  return { ok: true, departmentId };
}

/** Builds the Prisma `where` for "boards visible to this user" — filtering happens in the DB query. */
export function boardListWhereClause(user: CurrentUser): Prisma.BoardWhereInput {
  if (user.globalRole === "ADMIN") {
    return { deletedAt: null };
  }

  const departmentIds = user.departmentMemberships.map((d) => d.departmentId);

  return {
    deletedAt: null,
    OR: [
      { ownerId: user.id },
      { visibilityType: "GLOBAL" },
      { members: { some: { userId: user.id, deletedAt: null } } },
      ...(departmentIds.length > 0
        ? [{ visibilityType: "DEPARTMENT" as const, departmentId: { in: departmentIds } }]
        : []),
    ],
  };
}

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function requireBoardAccess(
  boardId: string,
  opts: { minEdit?: boolean; minDelete?: boolean; minManageMembers?: boolean } = {},
) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: jsonError(401, "ต้องเข้าสู่ระบบก่อน") } as const;
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId, deletedAt: null },
    include: { members: { where: { userId: user.id, deletedAt: null } } },
  });
  if (!board) {
    return { error: jsonError(404, "ไม่พบบอร์ดนี้") } as const;
  }

  const access = resolveBoardAccess(user, board);
  if (!access) {
    return { error: jsonError(403, "ไม่มีสิทธิ์เข้าถึง") } as const;
  }
  if (opts.minEdit && !access.canEdit) {
    return { error: jsonError(403, "ไม่มีสิทธิ์ทำรายการนี้") } as const;
  }
  if (opts.minDelete && !access.canDelete) {
    return { error: jsonError(403, "ไม่มีสิทธิ์ทำรายการนี้") } as const;
  }
  if (opts.minManageMembers && !access.canManageMembers) {
    return { error: jsonError(403, "ไม่มีสิทธิ์ทำรายการนี้") } as const;
  }

  return { user, board, access };
}

export async function requireGlobalAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: jsonError(401, "ต้องเข้าสู่ระบบก่อน") } as const;
  }
  if (user.globalRole !== "ADMIN") {
    return { error: jsonError(403, "ไม่มีสิทธิ์เข้าถึง") } as const;
  }
  return { user };
}

/** Whether a user is the board's owner or has a direct BoardMember invite — used to validate assignee picks. */
export async function isBoardParticipant(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({
    where: { id: boardId, deletedAt: null },
    select: { ownerId: true, members: { where: { userId, deletedAt: null }, select: { userId: true } } },
  });
  if (!board) return false;
  return board.ownerId === userId || board.members.length > 0;
}

export async function getBoardIdForColumn(columnId: string): Promise<string | null> {
  const column = await prisma.column.findUnique({
    where: { id: columnId, deletedAt: null },
    select: { boardId: true },
  });
  return column?.boardId ?? null;
}

export async function getBoardIdForTask(taskId: string): Promise<string | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId, deletedAt: null },
    select: { column: { select: { boardId: true } } },
  });
  return task?.column.boardId ?? null;
}

export async function getBoardIdForChecklistItem(itemId: string): Promise<string | null> {
  const item = await prisma.checklistItem.findUnique({
    where: { id: itemId, deletedAt: null },
    select: { task: { select: { column: { select: { boardId: true } } } } },
  });
  return item?.task.column.boardId ?? null;
}

export async function getBoardIdForTaskAttachment(attachmentId: string): Promise<string | null> {
  const attachment = await prisma.taskAttachment.findUnique({
    where: { id: attachmentId, deletedAt: null },
    select: { task: { select: { column: { select: { boardId: true } } } } },
  });
  return attachment?.task.column.boardId ?? null;
}

export async function getBoardIdForLabel(labelId: string): Promise<string | null> {
  const label = await prisma.label.findUnique({
    where: { id: labelId, deletedAt: null },
    select: { boardId: true },
  });
  return label?.boardId ?? null;
}
