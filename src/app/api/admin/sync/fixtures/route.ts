import { NextResponse } from "next/server";
export async function GET() {
  return new NextResponse("Deprecated", { status: 410 });
}
export async function POST() {
  return new NextResponse("Deprecated", { status: 410 });
}
export async function PATCH() {
  return new NextResponse("Deprecated", { status: 410 });
}
export async function DELETE() {
  return new NextResponse("Deprecated", { status: 410 });
}
