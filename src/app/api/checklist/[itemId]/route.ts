import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const data = await request.json();

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.text !== undefined && { text: data.text }),
      ...(data.done !== undefined && { done: data.done }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}
