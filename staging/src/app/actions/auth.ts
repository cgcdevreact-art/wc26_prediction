"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string, callbackUrl: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
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
