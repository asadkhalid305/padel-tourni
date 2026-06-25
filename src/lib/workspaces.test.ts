import { describe, expect, it, vi } from "vitest";

import { isWorkspaceAdminRole } from "@/lib/roles";
import { ensureDefaultWorkspaceForUser } from "@/lib/workspaces";

type MockWorkspaceClient = {
  insertWorkspace: ReturnType<typeof vi.fn>;
  insertMembership: ReturnType<typeof vi.fn>;
  insertPlayer: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
};

describe("workspace foundations", () => {
  it("treats owner and workspace admin as product admins", () => {
    expect(isWorkspaceAdminRole("owner")).toBe(true);
    expect(isWorkspaceAdminRole("admin")).toBe(true);
    expect(isWorkspaceAdminRole("member")).toBe(false);
  });

  it("reuses the first existing membership as the active workspace", async () => {
    const client = mockWorkspaceClient({
      existingMembership: { workspace_id: "workspace-1", role: "admin" },
    });

    await expect(
      ensureDefaultWorkspaceForUser(client as never, {
        id: "user-1",
        email: "owner@example.com",
        displayName: "Owner",
      }),
    ).resolves.toEqual({
      workspaceId: "workspace-1",
      role: "admin",
    });

    expect(client.insertWorkspace).not.toHaveBeenCalled();
    expect(client.insertMembership).not.toHaveBeenCalled();
  });

  it("prefers a valid active workspace membership from the cookie", async () => {
    const client = mockWorkspaceClient({
      preferredMembership: { workspace_id: "workspace-2", role: "member" },
      existingMembership: { workspace_id: "workspace-1", role: "owner" },
    });

    await expect(
      ensureDefaultWorkspaceForUser(
        client as never,
        {
          id: "user-1",
          email: "owner@example.com",
          displayName: "Owner",
        },
        "workspace-2",
      ),
    ).resolves.toEqual({
      workspaceId: "workspace-2",
      role: "member",
    });

    expect(client.insertWorkspace).not.toHaveBeenCalled();
    expect(client.insertMembership).not.toHaveBeenCalled();
  });

  it("ignores a stale active workspace cookie when the user is not a member", async () => {
    const client = mockWorkspaceClient({
      existingMembership: { workspace_id: "workspace-1", role: "owner" },
    });

    await expect(
      ensureDefaultWorkspaceForUser(
        client as never,
        {
          id: "user-1",
          email: "owner@example.com",
          displayName: "Owner",
        },
        "workspace-2",
      ),
    ).resolves.toEqual({
      workspaceId: "workspace-1",
      role: "owner",
    });
  });

  it("creates a private default workspace owned by a new signed-in user", async () => {
    const client = mockWorkspaceClient();

    await expect(
      ensureDefaultWorkspaceForUser(client as never, {
        id: "user-1",
        email: "owner@example.com",
        displayName: "Owner",
      }),
    ).resolves.toEqual({
      workspaceId: "workspace-1",
      role: "owner",
    });

    expect(client.insertWorkspace).toHaveBeenCalledWith({
      name: "Owner's workspace",
      personal_owner_app_user_id: "user-1",
    });
    expect(client.insertMembership).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      app_user_id: "user-1",
      role: "owner",
    });
    expect(client.insertPlayer).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      name: "Owner",
      account_email: "owner@example.com",
      app_user_id: "user-1",
      rating: 5,
      is_active: true,
    });
  });
});

function mockWorkspaceClient(options?: {
  preferredMembership?: {
    workspace_id: string;
    role: "owner" | "admin" | "member";
  };
  existingMembership?: {
    workspace_id: string;
    role: "owner" | "admin" | "member";
  };
}): MockWorkspaceClient {
  const insertWorkspace = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({
        data: { id: "workspace-1" },
        error: null,
      }),
    })),
  }));
  const insertMembership = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({
        data: { workspace_id: "workspace-1", role: "owner" },
        error: null,
      }),
    })),
  }));
  const insertPlayer = vi.fn().mockResolvedValue({ error: null });

  return {
    insertWorkspace,
    insertMembership,
    insertPlayer,
    from: vi.fn((table: string) => {
      if (table === "workspace_memberships") {
        const selectMembership = vi.fn(() => {
          const secondEq = vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: options?.preferredMembership ?? null,
              error: null,
            }),
          }));
          const firstEq = vi.fn(() => ({
            eq: secondEq,
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: options?.existingMembership ?? null,
                  error: null,
                }),
              })),
            })),
          }));

          return { eq: firstEq };
        });

        return {
          select: selectMembership,
          insert: insertMembership,
        };
      }
      if (table === "players") {
        return {
          select: vi.fn((columns: string) => {
            if (columns === "id,name,account_email") {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              };
            }
            if (columns === "id") {
              return {
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              };
            }

            return {
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
          insert: insertPlayer,
        };
      }

      return {
        insert: insertWorkspace,
      };
    }),
  };
}
