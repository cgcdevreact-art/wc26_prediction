import { requireAdmin } from "@/lib/commissioner";
import { CommissionerSidebar } from "@/components/commissioner/CommissionerSidebar";

export default async function CommissionerAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin guard — redirects non-admins to /commissioner/login
  await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <CommissionerSidebar />
      <main className="flex min-h-screen flex-1 flex-col lg:ml-64">{children}</main>
    </div>
  );
}
