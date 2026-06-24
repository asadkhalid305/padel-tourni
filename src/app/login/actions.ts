"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  createAuthClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseAuthConfigured()) {
    redirect("/login?error=auth-not-configured");
  }

  const authClient = await createAuthClient();
  if (!authClient) {
    redirect("/login?error=auth-not-configured");
  }

  const next = String(formData.get("next") ?? "/");
  const origin =
    (await headers()).get("origin") ??
    process.env.NEXT_PUBLIC_APP_ORIGIN ??
    "http://localhost:3100";
  const { data, error } = await authClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google-sign-in-failed");
  }

  redirect(data.url);
}
