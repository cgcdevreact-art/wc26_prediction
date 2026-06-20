import { NextResponse } from "next/server";
import { syncFixturesToDb } from "@/lib/fixtures/sync";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization");
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.AUTH_SECRET}`
  );
}

async function handleSync(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncFixturesToDb();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fixture sync failed";
    console.error("Fixture sync error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
