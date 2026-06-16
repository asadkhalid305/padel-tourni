import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { getAuthenticatedUser } from "@/lib/supabase/server";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Padel Tour",
    template: "%s | Padel Tour",
  },
  description:
    "Plan fair padel events, run live matches, and track standings over time.",
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
