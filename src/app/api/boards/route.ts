import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { boardListWhereClause, resolveBoardAccess, validateBoardVisibility } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import type { BoardVisibility } from "@/generated/prisma/client";

const VISIBILITY_TYPES: BoardVisibility[] = ["GLOBAL", "DEPARTMENT", "PERSONAL"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boards = await prisma.board.findMany({
    where: boardListWhereClause(user),
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { columns: true } },
      columns: { select: { _count: { select: { tasks: true } } } },
      members: { where: { userId: user.id }, select: { role: true } },
    },
  });

  const result = boards.map(({ columns, _count, members, ...board }) => ({
    ...board,
    columnCount: _count.columns,
    taskCount: columns.reduce((sum, c) => sum + c._count.tasks, 0),
    access: resolveBoardAccess(user, { ...board, members }),
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, visibilityType = "PERSONAL", departmentId } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!VISIBILITY_TYPES.includes(visibilityType)) {
    return NextResponse.json({ error: "invalid visibilityType" }, { status: 400 });
  }

  const visibility = validateBoardVisibility(user, visibilityType, departmentId);
  if (!visibility.ok) {
    return NextResponse.json({ error: visibility.error }, { status: visibility.status });
  }

  try {
    const board = await prisma.board.create({
      data: {
        name,
        ownerId: user.id,
        visibilityType,
        departmentId: visibility.departmentId,
        columns: {
          create: [
            { name: "To Do", order: 0 },
            { name: "In Progress", order: 1 },
            { name: "Done", order: 2 },
          ],
        },
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
