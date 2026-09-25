import { NextResponse } from "next/server";
import { getBoardIdForLabel, requireBoardAccess } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";
import { logActivity } from "@/lib/activityLog";
import { softDeleteLabel } from "@/lib/softDelete";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ labelId: string }> },
) {
  const { labelId } = await params;

  const boardId = await getBoardIdForLabel(labelId);
  if (!boardId) {
    return NextResponse.json({ error: "ไม่พบป้ายกำกับนี้" }, { status: 404 });
  }
  const gate = await requireBoardAccess(boardId, { minEdit: true });
  if ("error" in gate) return gate.error;

  try {
    const deleted = await softDeleteLabel(labelId);
    if (!deleted) {
      return NextResponse.json({ error: "ไม่พบป้ายกำกับนี้" }, { status: 404 });
    }

    await logActivity({
      boardId,
      entityType: "LABEL",
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
