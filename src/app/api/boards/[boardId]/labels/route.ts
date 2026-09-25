import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { logActivity } from "@/lib/activityLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;

  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  const { name, color } = await request.json();
  if (!name || !color) {
    return NextResponse.json({ error: "ต้องระบุชื่อและสีของป้ายกำกับ" }, { status: 400 });
  }

  try {
    const label = await prisma.label.create({
      data: { boardId, name, color },
    });

    await logActivity({
      boardId,
      entityType: "LABEL",
      entityId: label.id,
      entityName: label.name,
      action: "CREATED",
      actor: gate.user,
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
