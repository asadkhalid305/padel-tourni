import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: supabaseMocks.createServerClient,
  normalizeUserEmail: (email: string) => email.trim().toLowerCase(),
}));

import {
  adminRoleRequestSchema,
  isAdminRoleRequestAuthorized,
  setAdminRoleForEmail,
} from "@/lib/auth-admin";

describe("admin role management", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
  });

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

  it("refuses to demote a super admin account", async () => {
    const update = vi.fn();
    mockAppUsersClient({
      readUser: {
        id: "user-1",
        email: "asadkhalid305@gmail.com",
        role: "super_admin",
      },
      update,
    });

    const result = await setAdminRoleForEmail("asadkhalid305@gmail.com", false);

    expect(result).toEqual({
      ok: false,
      status: 403,
      message: "Super admin accounts cannot be demoted.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a member account to admin", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: "user-2",
              email: "organizer@example.com",
              role: "admin",
            },
            error: null,
          }),
        })),
      })),
    }));
    mockAppUsersClient({
      readUser: {
        id: "user-2",
        email: "organizer@example.com",
        role: "member",
      },
      update,
    });

    const result = await setAdminRoleForEmail("Organizer@Example.COM", true);

    expect(update).toHaveBeenCalledWith({ role: "admin" });
    expect(result).toEqual({
      ok: true,
      user: {
        id: "user-2",
        email: "organizer@example.com",
        role: "admin",
      },
    });
  });
});

function mockAppUsersClient({
  readUser,
  update = vi.fn(),
}: {
  readUser: { id: string; email: string; role: string } | null;
  update?: ReturnType<typeof vi.fn>;
}) {
  supabaseMocks.createServerClient.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: readUser,
            error: null,
          }),
        })),
      })),
      update,
    })),
  });
}
