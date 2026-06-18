import type { Database } from "@/types/database";

export type AppUserRole =
  Database["public"]["Tables"]["app_users"]["Row"]["role"];

export const DEFAULT_SUPER_ADMIN_EMAIL = "asadkhalid305@gmail.com";

export function isAdminRole(role: AppUserRole) {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdminRole(role: AppUserRole) {
  return role === "super_admin";
}

export function roleLabel(role: AppUserRole) {
  return role.replace("_", " ");
}
