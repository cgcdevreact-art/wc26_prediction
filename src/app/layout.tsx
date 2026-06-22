import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { getTeams, getGroupsConfig, getCupResults } from "@/lib/data";
import { TeamsProvider } from "@/components/TeamsProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalAuthModal } from "@/components/site/GlobalAuthModal";

export const metadata: Metadata = {
  title: "WC26 Predict",
  description: "Who will win the World Cup 2026?",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const teams = await getTeams();
  const groupsConfig = getGroupsConfig();
  const cupResults = getCupResults();
  const session = await auth();

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('wc26-ui-theme');
                  document.documentElement.classList.remove('light', 'dark');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} min-h-full flex flex-col`} suppressHydrationWarning>
        <SessionProvider session={session}>
          <ThemeProvider>
            <TeamsProvider teams={teams} groupsConfig={groupsConfig} results={cupResults}>
              {children}
              <GlobalAuthModal />
              <Toaster />
            </TeamsProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
