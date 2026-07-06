import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ error: "Space API has been deprecated. Use /api/albums instead." }, { status: 410 });
}
export function POST() {
  return NextResponse.json({ error: "Space API has been deprecated. Use /api/albums instead." }, { status: 410 });
}
