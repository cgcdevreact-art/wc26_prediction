import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export const metadata = {
  title: "Commissioner — WC26 Predict",
  description: "Commissioner control panel for WC26 Predict",
};

export default async function CommissionerRootLayout({
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
