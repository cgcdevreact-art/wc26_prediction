import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "src/data/instagram-config.json");

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken = "";
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      accessToken = config.accessToken || "";
    } catch (e) {
      console.error("Failed to read instagram config:", e);
    }
  }

  if (!accessToken) {
    return NextResponse.json({ connected: false });
  }

  try {
    const res = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
    if (!res.ok) {
      return NextResponse.json({ connected: false, error: "Invalid or expired access token." });
    }
    const data = await res.json();
    return NextResponse.json({ connected: true, username: data.username });
  } catch (error) {
    return NextResponse.json({ connected: true, username: "Unknown Profile", error: "Failed to connect to Meta API" });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken } = await request.json();
    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    // Save token
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ accessToken }, null, 2));

    // Test token
    const res = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
    if (!res.ok) {
      return NextResponse.json({ success: true, error: "Saved, but token could not be verified with Instagram API." });
    }
    const data = await res.json();

    return NextResponse.json({ success: true, username: data.username });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete configuration" }, { status: 500 });
  }
}
