import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { boardListWhereClause } from "@/lib/permissions";
import { handleRouteError } from "@/lib/apiError";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ต้องเข้าสู่ระบบก่อน" }, { status: 401 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: user.id,
        column: { board: boardListWhereClause(user) },
      },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "asc" }],
      include: {
        labels: true,
        checklist: { select: { id: true, done: true } },
        attachments: { select: { id: true } },
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        column: {
          select: {
            id: true,
            name: true,
            board: { select: { id: true, name: true, visibilityType: true } },
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return handleRouteError(error);
  }
}
