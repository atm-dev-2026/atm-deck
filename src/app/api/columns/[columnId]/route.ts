import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;
  const data = await request.json();

  const column = await prisma.column.update({
    where: { id: columnId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });

  return NextResponse.json(column);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ columnId: string }> },
) {
  const { columnId } = await params;
  await prisma.column.delete({ where: { id: columnId } });
  return NextResponse.json({ ok: true });
}
