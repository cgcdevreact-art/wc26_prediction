import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Admin — WC26 Predict",
  description: "Administration panel for WC26 Predict",
};

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </div>
    </SessionProvider>
  );
}
