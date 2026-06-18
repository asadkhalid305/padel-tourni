import "server-only";

import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export function isSupabaseConfigured() {
  return Boolean(
    isUsableSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function isSupabaseAuthConfigured() {
  return Boolean(
    isUsableSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!isUsableSupabaseUrl(url) || !secretKey) return null;

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!isUsableSupabaseUrl(url) || !publishableKey) return null;

  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components can read cookies but cannot always write them.
        }
      },
    },
  });
}

export type AppUserRole =
  Database["public"]["Tables"]["app_users"]["Row"]["role"];

export type AuthenticatedAppUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppUserRole;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedAppUser | null> {
  const authClient = await createAuthClient();
  if (!authClient) return null;

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();
  if (error || !user?.email) return null;

  const appUser = await ensureAppUser({
    id: user.id,
    email: user.email,
    displayName:
      typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : "",
  });

  return appUser;
}

export async function requireAdminUser(): Promise<AuthenticatedAppUser | null> {
  const user = await getAuthenticatedUser();
  return user?.role === "admin" ? user : null;
}

export async function ensureAppUser({
  id,
  email,
  displayName,
}: {
  id: string;
  email: string;
  displayName: string;
}): Promise<AuthenticatedAppUser | null> {
  const client = createServerClient();
  if (!client) return null;

  const normalizedEmail = normalizeUserEmail(email);
  const { data, error } = await client
    .from("app_users")
    .upsert(
      {
        id,
        email: normalizedEmail,
        display_name: displayName,
      },
      { onConflict: "id", ignoreDuplicates: false },
    )
    .select("id,email,display_name,role")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    role: data.role,
  };
}

export function normalizeUserEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUsableSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false;

  try {
    const supabaseUrl = new URL(url);
    const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (!appOrigin) return true;

    return supabaseUrl.origin !== new URL(appOrigin).origin;
  } catch {
    return false;
  }
}
