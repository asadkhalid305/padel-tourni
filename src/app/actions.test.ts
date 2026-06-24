import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
  requireWorkspaceAdminUser: vi.fn(),
}));

const adminMocks = vi.hoisted(() => ({
  setAppUserRole: vi.fn(),
}));

const headerMocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: headerMocks.cookies,
  headers: headerMocks.headers,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  ACTIVE_WORKSPACE_COOKIE: "padeltour_active_workspace_id",
  createAuthClient: vi.fn(),
  createServerClient: supabaseMocks.createServerClient,
  getAuthenticatedUser: supabaseMocks.getAuthenticatedUser,
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

import {
  acceptWorkspaceInvite,
  createWorkspaceInvite,
  savePlayer,
  setPlayerAdminRole,
} from "@/app/actions";

describe("RBAC server actions", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.getAuthenticatedUser.mockReset();
    supabaseMocks.requireSuperAdminUser.mockReset();
    supabaseMocks.requireWorkspaceAdminUser.mockReset();
    adminMocks.setAppUserRole.mockReset();
    headerMocks.cookies.mockReset();
    headerMocks.headers.mockReset();
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

  it("creates a workspace invite without storing the raw token", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
      displayName: "Owner",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({ insert })),
    });
    headerMocks.headers.mockResolvedValue({
      get: vi.fn(() => "http://localhost:3100"),
    });
    const formData = new FormData();
    formData.set("email", " New.Member@Example.COM ");

    const result = await createWorkspaceInvite(
      { ok: false, message: "" },
      formData,
    );

    expect(result.ok).toBe(true);
    expect(result.inviteUrl).toMatch(
      /^http:\/\/localhost:3100\/invites\/[A-Za-z0-9_-]+$/,
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "workspace-1",
        invited_email: "new.member@example.com",
        created_by_app_user_id: "owner-user",
      }),
    );
    expect(insert.mock.calls[0][0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.inviteUrl).not.toContain(insert.mock.calls[0][0].token_hash);
  });

  it("accepts a pending invite, adds membership, and switches active workspace", async () => {
    const upsertMembership = vi.fn().mockResolvedValue({ error: null });
    const updateInvite = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    const cookieSet = vi.fn();
    supabaseMocks.getAuthenticatedUser.mockResolvedValue({
      id: "member-user",
      email: "member@example.com",
      displayName: "Member",
      role: "member",
      activeWorkspaceId: "personal-workspace",
      activeWorkspaceRole: "owner",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "workspace_memberships") {
          return { upsert: upsertMembership };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "invite-1",
                  workspace_id: "shared-workspace",
                  invited_email: "member@example.com",
                  status: "pending",
                  expires_at: "2999-01-01T00:00:00.000Z",
                },
                error: null,
              }),
            })),
          })),
          update: updateInvite,
        };
      }),
    });
    headerMocks.cookies.mockResolvedValue({ set: cookieSet });
    const formData = new FormData();
    formData.set("token", "abcdefghijklmnopqrstuvwxyz1234567890");

    await expect(
      acceptWorkspaceInvite({ ok: false, message: "" }, formData),
    ).rejects.toThrow("redirect:/");

    expect(upsertMembership).toHaveBeenCalledWith(
      {
        workspace_id: "shared-workspace",
        app_user_id: "member-user",
        role: "member",
      },
      { onConflict: "workspace_id,app_user_id", ignoreDuplicates: true },
    );
    expect(updateInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "accepted",
        accepted_by_app_user_id: "member-user",
      }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      "padeltour_active_workspace_id",
      "shared-workspace",
      {
        sameSite: "lax",
        path: "/",
      },
    );
  });
});
