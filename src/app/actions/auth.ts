"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string, callbackUrl: string) {
  try {
    // Check if user is admin — redirect to admin dashboard
    const user = await prisma.user.findUnique({
      where: { email },
    });

    const isAdmin = user?.role === "admin";
    const finalRedirect = isAdmin ? "/commissioner" : callbackUrl;

    if (user?.isBlocked) {
      return { error: "Your account has been blocked." };
    }

    await signIn("credentials", {
      email,
      password,
      redirectTo: finalRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials. Please try again." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error; // Re-throw NEXT_REDIRECT to allow Next.js to handle the redirect
  }
}
