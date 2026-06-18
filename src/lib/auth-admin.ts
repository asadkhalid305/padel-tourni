import "server-only";

import { z } from "zod";

import { isSuperAdminRole } from "@/lib/roles";
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
  const { data: existing, error: readError } = await client
    .from("app_users")
    .select("id,email,role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (readError) {
    return { ok: false as const, status: 500, message: readError.message };
  }
  if (!existing) {
    return {
      ok: false as const,
      status: 404,
      message: "No account exists for that email address.",
    };
  }
  if (isSuperAdminRole(existing.role)) {
    if (!isAdmin) {
      return {
        ok: false as const,
        status: 403,
        message: "Super admin accounts cannot be demoted.",
      };
    }
    return { ok: true as const, user: existing };
  }

  const { data, error } = await client
    .from("app_users")
    .update({ role: isAdmin ? "admin" : "member" })
    .eq("id", existing.id)
    .select("id,email,role")
    .single();

  if (error) {
    return { ok: false as const, status: 500, message: error.message };
  }

  return { ok: true as const, user: data };
}
