import { describe, expect, it, vi } from "vitest";

import {
  ensureDefaultWorkspaceForUser,
  isWorkspaceAdminRole,
} from "@/lib/workspaces";

type MockWorkspaceClient = {
  insertWorkspace: ReturnType<typeof vi.fn>;
  insertMembership: ReturnType<typeof vi.fn>;
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
  });
});

function mockWorkspaceClient(options?: {
  existingMembership?: { workspace_id: string; role: "owner" | "admin" };
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

  return {
    insertWorkspace,
    insertMembership,
    from: vi.fn((table: string) => {
      if (table === "workspace_memberships") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options?.existingMembership ?? null,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          insert: insertMembership,
        };
      }

      return {
        insert: insertWorkspace,
      };
    }),
  };
}
