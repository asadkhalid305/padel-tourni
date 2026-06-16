import "server-only";

import { z } from "zod";

import { createServerClient, normalizeUserEmail } from "@/lib/supabase/server";

export const adminRoleRequestSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? normalizeUserEmail(value) : value),
    z.string().email(),
  ),
});

export function isAdminRoleRequestAuthorized(request: Request) {
  const configuredSecret = process.env.ADMIN_ROLE_API_SECRET;
  const providedSecret = request.headers.get("x-admin-role-secret");

  return Boolean(configuredSecret && providedSecret === configuredSecret);
}

export async function setAdminRoleForEmail(email: string, isAdmin: boolean) {
  const client = createServerClient();
  if (!client) {
    return {
      ok: false as const,
      status: 503,
      message: "Supabase is not configured.",
    };
  }

  const normalizedEmail = normalizeUserEmail(email);
  const { data, error } = await client
    .from("app_users")
    .update({ role: isAdmin ? "admin" : "member" })
    .eq("email", normalizedEmail)
    .select("id,email,role")
    .maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, message: error.message };
  }
  if (!data) {
    return {
      ok: false as const,
      status: 404,
      message: "No account exists for that email address.",
    };
  }

  return { ok: true as const, user: data };
}
