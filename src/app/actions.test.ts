import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  requireSuperAdminUser: vi.fn(),
  requireWorkspaceAdminUser: vi.fn(),
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
  requireSuperAdminUser: supabaseMocks.requireSuperAdminUser,
  requireWorkspaceAdminUser: supabaseMocks.requireWorkspaceAdminUser,
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
    supabaseMocks.requireSuperAdminUser.mockReset();
    supabaseMocks.requireWorkspaceAdminUser.mockReset();
    adminMocks.setAppUserRole.mockReset();
  });

  it("blocks member users before player mutations reach Supabase", async () => {
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue(null);
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

  it("rejects player account links outside the active workspace", async () => {
    const insert = vi.fn();
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
      displayName: "Owner",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "workspace_memberships") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          };
        }

        return { insert };
      }),
    });
    const formData = new FormData();
    formData.set("name", "External Account");
    formData.set("rating", "5");
    formData.set("isActive", "true");
    formData.set("appUserId", "00000000-0000-4000-8000-000000000001");

    const result = await savePlayer({ ok: false, message: "" }, formData);

    expect(result).toEqual({
      ok: false,
      message: "Choose an account that belongs to this workspace.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("parses the remove-admin form value as false", async () => {
    supabaseMocks.requireSuperAdminUser.mockResolvedValue({
      id: "super-admin",
      email: "asadkhalid305@gmail.com",
      displayName: "Asad",
      role: "super_admin",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
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
