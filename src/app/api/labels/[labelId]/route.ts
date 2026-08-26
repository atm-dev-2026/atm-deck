import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ labelId: string }> },
) {
  const { labelId } = await params;
  await prisma.label.delete({ where: { id: labelId } });
  return NextResponse.json({ ok: true });
}
