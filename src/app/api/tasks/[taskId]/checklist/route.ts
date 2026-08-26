import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const lastItem = await prisma.checklistItem.findFirst({
    where: { taskId },
    orderBy: { order: "desc" },
  });

  const item = await prisma.checklistItem.create({
    data: {
      taskId,
      text,
      order: lastItem ? lastItem.order + 1 : 0,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
