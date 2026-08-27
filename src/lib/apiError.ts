import { NextResponse } from "next/server";

export function handleRouteError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
