import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppEnv } from "@/lib/config";
import { checkHealth } from "@/lib/health";

export async function GET() {
  const report = await checkHealth({
    prisma,
    storageRoot: getAppEnv().STORAGE_ROOT
  });

  return NextResponse.json(report, {
    status: report.status === "unhealthy" ? 503 : 200
  });
}
