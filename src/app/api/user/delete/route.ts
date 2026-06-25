import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function handleDeleteUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Delete the user from the database.
    // All related accounts, sessions, predictions, settings are configured with `onDelete: Cascade` in schema.prisma.
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ 
      success: true, 
      message: "User account and all associated prediction data have been permanently deleted." 
    });
  } catch (error) {
    console.error("Error deleting user data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  return handleDeleteUser();
}

export async function DELETE() {
  return handleDeleteUser();
}
