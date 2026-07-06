import { NextResponse } from "next/server";
export function POST() {
  return NextResponse.json({ error: "Space API has been deprecated. Use /api/albums/[id]/photos/upload instead." }, { status: 410 });
}
