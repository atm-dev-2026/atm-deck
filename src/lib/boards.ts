import { prisma } from "@/lib/prisma";
import { boardListWhereClause, resolveBoardAccess, type BoardAccess } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/current-user";

const boardDetailInclude = {
  labels: { where: { deletedAt: null }, orderBy: { name: "asc" } },
  columns: {
    where: { deletedAt: null },
    orderBy: { order: "asc" },
    include: {
      tasks: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          labels: { where: { deletedAt: null } },
          checklist: { where: { deletedAt: null }, orderBy: { order: "asc" } },
          attachments: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
          createdBy: { select: { id: true, name: true, email: true, image: true } },
          assignee: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  },
  owner: { select: { id: true, name: true, email: true, image: true } },
  members: {
    where: { deletedAt: null },
    orderBy: { invitedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  },
} as const;

export type BoardDetailResult =
  | { ok: true; board: NonNullable<Awaited<ReturnType<typeof fetchBoardWithDetail>>>; access: BoardAccess }
  | { ok: false; status: 404 | 403 };

function fetchBoardWithDetail(boardId: string) {
  return prisma.board.findUnique({
    where: { id: boardId, deletedAt: null },
    include: boardDetailInclude,
  });
}

/**
 * Fetches a board's full detail payload once and resolves the requesting user's
 * access from that same `members` result, instead of a separate access-check
 * query — shared by the board detail API route and the board page's server
 * component so the two can never diverge and neither pays for two board round
 * trips per request.
 */
export async function getBoardDetail(boardId: string, user: CurrentUser): Promise<BoardDetailResult> {
  const board = await fetchBoardWithDetail(boardId);
  if (!board) return { ok: false, status: 404 };

  const access = resolveBoardAccess(user, {
    ownerId: board.ownerId,
    visibilityType: board.visibilityType,
    departmentId: board.departmentId,
    members: board.members.filter((m) => m.userId === user.id),
  });
  if (!access) return { ok: false, status: 403 };

  return { ok: true, board, access };
}

/**
 * Fetches the board list (with column/task counts and per-board access) for a
 * user — shared by GET /api/boards and the home page's server component.
 */
export async function getBoardsForUser(user: CurrentUser) {
  const boards = await prisma.board.findMany({
    where: boardListWhereClause(user),
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { columns: { where: { deletedAt: null } } } },
      columns: {
        where: { deletedAt: null },
        select: { _count: { select: { tasks: { where: { deletedAt: null } } } } },
      },
      members: { where: { userId: user.id, deletedAt: null }, select: { role: true } },
    },
  });

  return boards.map(({ columns, _count, members, ...board }) => ({
    ...board,
    columnCount: _count.columns,
    taskCount: columns.reduce((sum, c) => sum + c._count.tasks, 0),
    access: resolveBoardAccess(user, { ...board, members }),
  }));
}
