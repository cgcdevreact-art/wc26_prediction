import { requireAdmin } from "@/lib/admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin guard — redirects non-admins to /admin/login
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex min-h-screen flex-1 flex-col lg:ml-64">{children}</main>
    </div>
  );
}
