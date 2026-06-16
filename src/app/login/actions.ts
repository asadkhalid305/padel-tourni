"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  createAuthClient,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/server";

export async function signInWithGoogle() {
  if (!isSupabaseAuthConfigured()) {
    redirect("/login?error=auth-not-configured");
  }

  const authClient = await createAuthClient();
  if (!authClient) {
    redirect("/login?error=auth-not-configured");
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { data, error } = await authClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google-sign-in-failed");
  }

  redirect(data.url);
}
