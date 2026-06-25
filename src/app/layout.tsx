import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

import Script from "next/script";

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
import { CookieConsent } from "@/components/site/CookieConsent";

export const metadata: Metadata = {
  title: "WC26 Predict",
  description: "Who will win the World Cup 2026?",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
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
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
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

      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4746258958164249" crossorigin="anonymous"></script>
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} min-h-full flex flex-col`} suppressHydrationWarning>
        <SessionProvider session={session}>
          <ThemeProvider>
            <TeamsProvider teams={teams} groupsConfig={groupsConfig} results={cupResults}>
              {children}
              <GlobalAuthModal />
              <CookieConsent />
              <Toaster />
            </TeamsProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
