import "server-only";

import { z } from "zod";

import { isSuperAdminRole, type AppUserRole } from "@/lib/roles";
import { createServerClient, normalizeUserEmail } from "@/lib/supabase/server";

export const adminRoleRequestSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? normalizeUserEmail(value) : value),
    z.string().email(),
  ),
  role: z.enum(["admin", "super_admin"]).default("admin"),
});

export const appUserRoleSchema = z.enum(["member", "admin", "super_admin"]);

export function isAdminRoleRequestAuthorized(request: Request) {
  const configuredSecret = process.env.ADMIN_ROLE_API_SECRET;
  const providedSecret = request.headers.get("x-admin-role-secret");

  return Boolean(configuredSecret && providedSecret === configuredSecret);
}

export async function setAdminRoleForEmail(email: string, isAdmin: boolean) {
  return setAppUserRoleByEmail(email, isAdmin ? "admin" : "member");
}

export async function setAppUserRoleByEmail(email: string, role: AppUserRole) {
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

  return setAppUserRole(existing.id, role);
}

export async function setAppUserRole(id: string, role: AppUserRole) {
  const client = createServerClient();
  if (!client) {
    return {
      ok: false as const,
      status: 503,
      message: "Supabase is not configured.",
    };
  }

  const { data: existing, error: readError } = await client
    .from("app_users")
    .select("id,email,role")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return { ok: false as const, status: 500, message: readError.message };
  }
  if (!existing) {
    return {
      ok: false as const,
      status: 404,
      message: "No account exists for that user.",
    };
  }
  if (
    isSuperAdminRole(existing.role) &&
    !isSuperAdminRole(role) &&
    (await wouldRemoveLastSuperAdmin(existing.id))
  ) {
    return {
      ok: false as const,
      status: 403,
      message: "At least one super admin account must remain.",
    };
  }
  if (existing.role === role) {
    return { ok: true as const, user: existing };
  }

  const { data, error } = await client
    .from("app_users")
    .update({ role })
    .eq("id", existing.id)
    .select("id,email,role")
    .single();

  if (error) {
    return { ok: false as const, status: 500, message: error.message };
  }

  return { ok: true as const, user: data };
}

async function wouldRemoveLastSuperAdmin(id: string) {
  const client = createServerClient();
  if (!client) return true;

  const { count, error } = await client
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "super_admin")
    .neq("id", id);
  if (error) throw error;

  return (count ?? 0) === 0;
}
