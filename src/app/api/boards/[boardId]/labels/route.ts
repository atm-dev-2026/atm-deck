import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;
  const { name, color } = await request.json();
  if (!name || !color) {
    return NextResponse.json({ error: "name and color are required" }, { status: 400 });
  }

  const label = await prisma.label.create({
    data: { boardId, name, color },
  });

  return NextResponse.json(label, { status: 201 });
}
