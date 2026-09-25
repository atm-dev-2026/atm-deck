import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess, validateBoardVisibility } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/current-user";
import { getBoardDetail } from "@/lib/boards";
import { handleRouteError } from "@/lib/apiError";
import { buildChange, logActivity } from "@/lib/activityLog";
import { softDeleteBoard } from "@/lib/softDelete";
import type { BoardVisibility } from "@/generated/prisma/client";

const VISIBILITY_TYPES: BoardVisibility[] = ["GLOBAL", "DEPARTMENT", "PERSONAL"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  const result = await getBoardDetail(boardId, user);
  if (!result.ok) {
    const error = result.status === 404 ? "ไม่พบบอร์ดนี้" : "ไม่มีสิทธิ์เข้าถึง";
    return NextResponse.json({ error }, { status: result.status });
  }

  return NextResponse.json({ ...result.board, access: result.access });
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
      return NextResponse.json({ error: "ชื่อบอร์ดต้องไม่ว่างเปล่า" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (visibilityType !== undefined) {
    if (!VISIBILITY_TYPES.includes(visibilityType)) {
      return NextResponse.json({ error: "ประเภทการมองเห็นไม่ถูกต้อง" }, { status: 400 });
    }
    const visibility = validateBoardVisibility(gate.user, visibilityType, departmentId);
    if (!visibility.ok) {
      return NextResponse.json({ error: visibility.error }, { status: visibility.status });
    }
    data.visibilityType = visibilityType;
    data.departmentId = visibility.departmentId;
  }

  try {
    const before = await prisma.board.findUnique({
      where: { id: boardId },
      select: { name: true, visibilityType: true, departmentId: true, department: { select: { name: true } } },
    });

    const board = await prisma.board.update({ where: { id: boardId }, data });

    const changes = [
      before && data.name !== undefined ? buildChange("name", before.name, board.name) : null,
      before && data.visibilityType !== undefined
        ? buildChange("visibility", before.visibilityType, board.visibilityType)
        : null,
    ].filter((c): c is NonNullable<typeof c> => c !== null);

    if (before && data.departmentId !== undefined && data.departmentId !== before.departmentId) {
      const newDepartment = data.departmentId
        ? await prisma.department.findUnique({ where: { id: data.departmentId }, select: { name: true } })
        : null;
      const departmentChange = buildChange(
        "department",
        before.department?.name ?? null,
        newDepartment?.name ?? null,
      );
      if (departmentChange) changes.push(departmentChange);
    }

    if (changes.length > 0) {
      await logActivity({
        boardId,
        entityType: "BOARD",
        entityId: board.id,
        entityName: board.name,
        action: "UPDATED",
        actor: gate.user,
        changes,
      });
    }

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
    const deleted = await softDeleteBoard(boardId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบบอร์ดนี้" }, { status: 404 });
    }

    await logActivity({
      boardId,
      entityType: "BOARD",
      entityId: deleted.id,
      entityName: deleted.name,
      action: "DELETED",
      actor: gate.user,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
