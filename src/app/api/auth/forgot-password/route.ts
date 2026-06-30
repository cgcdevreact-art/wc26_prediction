import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log(`[Forgot Password] User not found for email: ${email}`);
      // Temporarily returning 404 for debugging so you can see if this is the issue
      return NextResponse.json(
        { error: "No account found with that email address." },
        { status: 404 }
      );
    }

    console.log(`[Forgot Password] Found user, generating token...`);
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.passwordResetToken.deleteMany({
      where: { email },
    });

    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      },
    });

    await sendPasswordResetEmail(email, token);

    return NextResponse.json(
      { message: "If an account with that email exists, we have sent a reset link." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
