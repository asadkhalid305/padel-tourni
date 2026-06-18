import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  requireAdminUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  setAppUserRole: vi.fn(),
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

vi.mock("@/lib/auth-admin", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth-admin")>(
      "@/lib/auth-admin",
    );
  return {
    ...actual,
    setAppUserRole: adminMocks.setAppUserRole,
  };
});

import { savePlayer, setPlayerAdminRole } from "@/app/actions";

describe("RBAC server actions", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.requireAdminUser.mockReset();
    supabaseMocks.requireSuperAdminUser.mockReset();
    adminMocks.setAppUserRole.mockReset();
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
    adminMocks.setAppUserRole.mockResolvedValue({
      ok: true,
      user: {
        id: "admin-user",
        email: "organizer@example.com",
        role: "member",
      },
    });
    const formData = new FormData();
    formData.set("appUserId", "00000000-0000-4000-8000-000000000001");
    formData.set("role", "member");

    const result = await setPlayerAdminRole(
      { ok: false, message: "" },
      formData,
    );

    expect(adminMocks.setAppUserRole).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "member",
    );
    expect(result).toEqual({ ok: true, message: "Role updated to member." });
  });
});
