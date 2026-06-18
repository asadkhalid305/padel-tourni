import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  requireAdminUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  setAdminRoleForEmail: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAuthClient: vi.fn(),
  createServerClient: supabaseMocks.createServerClient,
  requireAdminUser: supabaseMocks.requireAdminUser,
  requireSuperAdminUser: supabaseMocks.requireSuperAdminUser,
}));

vi.mock("@/lib/auth-admin", () => ({
  setAdminRoleForEmail: adminMocks.setAdminRoleForEmail,
}));

import { savePlayer, setPlayerAdminRole } from "@/app/actions";

describe("RBAC server actions", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.requireAdminUser.mockReset();
    supabaseMocks.requireSuperAdminUser.mockReset();
    adminMocks.setAdminRoleForEmail.mockReset();
  });

  it("blocks member users before player mutations reach Supabase", async () => {
    supabaseMocks.requireAdminUser.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("name", "Member Managed");
    formData.set("rating", "5");
    formData.set("isActive", "true");

    const result = await savePlayer({ ok: false, message: "" }, formData);

    expect(result).toEqual({
      ok: false,
      message: "Only admins can make changes.",
    });
    expect(supabaseMocks.createServerClient).not.toHaveBeenCalled();
  });

  it("parses the remove-admin form value as false", async () => {
    supabaseMocks.requireSuperAdminUser.mockResolvedValue({
      id: "super-admin",
      email: "asadkhalid305@gmail.com",
      displayName: "Asad",
      role: "super_admin",
    });
    adminMocks.setAdminRoleForEmail.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-user",
        email: "organizer@example.com",
        role: "member",
      },
    });
    const formData = new FormData();
    formData.set("email", "organizer@example.com");
    formData.set("isAdmin", "false");

    const result = await setPlayerAdminRole(
      { ok: false, message: "" },
      formData,
    );

    expect(adminMocks.setAdminRoleForEmail).toHaveBeenCalledWith(
      "organizer@example.com",
      false,
    );
    expect(result).toEqual({ ok: true, message: "Admin revoked." });
  });
});
