"use server";

import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";

export async function adminLoginAction(email: string, password: string) {
  try {
    // First verify the user is an admin before attempting sign in
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "admin") {
      return { error: "Access denied. Admin privileges required." };
    }

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
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
