import { prisma } from "@/lib/prisma";
import { boardListWhereClause } from "@/lib/permissions";
import type { CurrentUser } from "@/lib/current-user";

/**
 * Tasks assigned to `user` on boards they can still see — shared by
 * GET /api/tasks/mine and the My Tasks page's server component.
 */
export function getMyTasks(user: CurrentUser) {
  return prisma.task.findMany({
    where: {
      assigneeId: user.id,
      deletedAt: null,
      column: { deletedAt: null, board: boardListWhereClause(user) },
    },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "asc" }],
    include: {
      labels: { where: { deletedAt: null } },
      checklist: { where: { deletedAt: null }, select: { id: true, done: true } },
      attachments: { where: { deletedAt: null }, select: { id: true } },
      createdBy: { select: { id: true, name: true, email: true, image: true } },
      column: {
        select: {
          id: true,
          name: true,
          isDone: true,
          board: { select: { id: true, name: true, visibilityType: true } },
        },
      },
    },
  });
}
