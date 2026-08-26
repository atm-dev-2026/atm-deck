import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { boardListWhereClause } from "@/lib/permissions";
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
    },
  });

  const result = boards.map(({ columns, _count, ...board }) => ({
    ...board,
    columnCount: _count.columns,
    taskCount: columns.reduce((sum, c) => sum + c._count.tasks, 0),
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

  if (visibilityType === "DEPARTMENT") {
    if (!departmentId || typeof departmentId !== "string") {
      return NextResponse.json(
        { error: "departmentId is required for DEPARTMENT boards" },
        { status: 400 },
      );
    }
    const isMember = user.departmentMemberships.some((d) => d.departmentId === departmentId);
    if (user.globalRole !== "ADMIN" && !isMember) {
      return NextResponse.json(
        { error: "You must be a member of this department to create a board for it" },
        { status: 403 },
      );
    }
  }

  const board = await prisma.board.create({
    data: {
      name,
      ownerId: user.id,
      visibilityType,
      departmentId: visibilityType === "DEPARTMENT" ? departmentId : null,
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
}
