import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Server-side guard for commissioner routes.
 * Call at the top of any commissioner page/layout to enforce access.
 * Redirects to /commissioner/login if the user is not authenticated or not an admin.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/commissioner/login");
  }

  if (session.user.role !== "admin") {
    redirect("/commissioner/login");
  }

  return session;
}

/**
 * Client-side helper to check if a session user is an admin.
 */
export function isAdmin(session: any): boolean {
  return session?.user?.role === "admin";
}
