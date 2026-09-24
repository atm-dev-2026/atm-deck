import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess, validateBoardVisibility } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import type { BoardVisibility } from "@/generated/prisma/client";

const VISIBILITY_TYPES: BoardVisibility[] = ["GLOBAL", "DEPARTMENT", "PERSONAL"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId);
  if ("error" in gate) return gate.error;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      labels: { orderBy: { name: "asc" } },
      columns: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              labels: true,
              checklist: { orderBy: { order: "asc" } },
              attachments: { orderBy: { createdAt: "asc" } },
              createdBy: { select: { id: true, name: true, email: true, image: true } },
              assignee: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      },
      owner: { select: { id: true, name: true, email: true, image: true } },
      members: {
        orderBy: { invitedAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  return NextResponse.json({ ...board, access: gate.access });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const { name, visibilityType, departmentId } = await request.json();

  const data: { name?: string; visibilityType?: BoardVisibility; departmentId?: string | null } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (visibilityType !== undefined) {
    if (!VISIBILITY_TYPES.includes(visibilityType)) {
      return NextResponse.json({ error: "invalid visibilityType" }, { status: 400 });
    }
    const visibility = validateBoardVisibility(gate.user, visibilityType, departmentId);
    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.error }, { status: visibility.status });
    }
    data.visibilityType = visibilityType;
    data.departmentId = visibility.departmentId;
  }

  try {
    const board = await prisma.board.update({ where: { id: boardId }, data });
    return NextResponse.json(board);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId, { minDelete: true });
  if ("error" in gate) return gate.error;

  try {
    await prisma.board.delete({ where: { id: boardId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
