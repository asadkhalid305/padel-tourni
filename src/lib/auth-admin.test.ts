import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
  normalizeUserEmail: (email: string) => email.trim().toLowerCase(),
}));

import {
  adminRoleRequestSchema,
  isAdminRoleRequestAuthorized,
} from "@/lib/auth-admin";

describe("admin role management", () => {
  it("normalizes email input before role updates", () => {
    const parsed = adminRoleRequestSchema.parse({
      email: "  Organizer@Example.COM ",
    });

    expect(parsed.email).toBe("organizer@example.com");
  });

  it("requires the configured endpoint secret", () => {
    vi.stubEnv("ADMIN_ROLE_API_SECRET", "secret-value");

    expect(
      isAdminRoleRequestAuthorized(
        new Request("http://localhost/api/admin/users/grant", {
          headers: { "x-admin-role-secret": "secret-value" },
        }),
      ),
    ).toBe(true);
    expect(
      isAdminRoleRequestAuthorized(
        new Request("http://localhost/api/admin/users/grant", {
          headers: { "x-admin-role-secret": "wrong-value" },
        }),
      ),
    ).toBe(false);

    vi.unstubAllEnvs();
  });
});
