import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getAuthenticatedUser } from "@/lib/supabase/server";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3100",
  ),
  title: {
    default: "Padel Tourni",
    template: "%s | Padel Tourni",
  },
  description:
    "Plan fair padel events, run live matches, and track standings over time.",
  applicationName: "Padel Tourni",
  openGraph: {
    type: "website",
    siteName: "Padel Tourni",
    title: "Padel Tourni",
    description:
      "Fair draws, live scoring, and standings for better padel events.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Padel Tourni",
    description:
      "Fair draws, live scoring, and standings for better padel events.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userPromise = getAuthenticatedUser();

  return (
    <html lang="en">
      <body>
        <AppShell userPromise={userPromise}>{children}</AppShell>
      </body>
    </html>
  );
}
