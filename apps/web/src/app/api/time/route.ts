import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    success: true,
    timestamp: now.getTime(),
    iso: now.toISOString(),
    timezone: "Asia/Jakarta",
  });
}
