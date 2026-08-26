import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const boards = await prisma.board.findMany({
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
  const { name } = await request.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      name,
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
