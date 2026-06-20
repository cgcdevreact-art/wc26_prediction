import { auth } from "./auth";
import { redirect } from "next/navigation";

/**
 * Server-side guard for admin routes.
 * Call at the top of any admin page/layout to enforce admin access.
 * Redirects to /admin/login if the user is not authenticated or not an admin.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/login");
  }

  return session;
}

/**
 * Client-side helper to check if a session user is an admin.
 */
export function isAdmin(session: any): boolean {
  return session?.user?.role === "admin";
}
