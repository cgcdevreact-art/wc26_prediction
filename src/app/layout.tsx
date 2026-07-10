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
import { GlobalAnnouncementModal } from "@/components/site/GlobalAnnouncementModal";
import { getActiveAnnouncement } from "@/app/actions/announcements";

export const metadata: Metadata = {
  title: "26WC Prediction",
  description: "Who will win the World Cup 2026?",
  icons: {
    icon: "/26wc-logo.png",
    shortcut: "/26wc-logo.png",
    apple: "/26wc-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const teams = await getTeams();
  const groupsConfig = getGroupsConfig();
  const cupResults = await getCupResults();
  const session = await auth();
  const activeAnnouncement = await getActiveAnnouncement();

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

        {process.env.NEXT_PUBLIC_APP_ENV === "production" && (
          <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4746258958164249" crossOrigin="anonymous"></script>
        )}
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} min-h-full flex flex-col`} suppressHydrationWarning>
        <SessionProvider session={session}>
          <ThemeProvider>
            <TeamsProvider teams={teams} groupsConfig={groupsConfig} results={cupResults}>
              {children}
              <GlobalAuthModal />
              <CookieConsent />
              <Toaster />
              <GlobalAnnouncementModal announcement={activeAnnouncement} />
            </TeamsProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
