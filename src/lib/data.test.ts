import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: supabaseMocks.createServerClient,
  isSupabaseConfigured: () => true,
}));

import {
  canViewPrivateData,
  listEvents,
  listLinkableAppUsers,
  listPlayers,
} from "@/lib/data";

describe("private data access", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
  });

  it("allows signed-in users with an active workspace", async () => {
    supabaseMocks.createServerClient.mockReturnValue({});

    await expect(
      canViewPrivateData({
        id: "owner-user",
        role: "member",
        activeWorkspaceId: "workspace-1",
      }),
    ).resolves.toBe(true);
  });

  it("blocks signed-in users without an active workspace", async () => {
    supabaseMocks.createServerClient.mockReturnValue({});

    await expect(
      canViewPrivateData({ id: "member-user", role: "super_admin" }),
    ).resolves.toBe(false);
  });
});

describe("workspace-scoped reads", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
  });

  it("returns no persisted players when no workspace is active", async () => {
    const from = vi.fn();
    supabaseMocks.createServerClient.mockReturnValue({ from });

    await expect(listPlayers(null)).resolves.toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("loads players only from the active workspace", async () => {
    const workspaceFilter = vi.fn(() => ({
      order: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "player-1",
              app_user_id: null,
              name: "Workspace Player",
              account_email: null,
              rating: 6.5,
              is_active: true,
            },
          ],
          error: null,
        }),
      })),
    }));
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: workspaceFilter,
        })),
      })),
    });

    await expect(listPlayers("workspace-1")).resolves.toEqual([
      {
        id: "player-1",
        name: "Workspace Player",
        appUserId: null,
        accountEmail: null,
        accountDisplayName: null,
        accountRole: null,
        rating: 6.5,
        isActive: true,
      },
    ]);
    expect(workspaceFilter).toHaveBeenCalledWith("workspace_id", "workspace-1");
  });

  it("loads events only from the active workspace", async () => {
    const workspaceFilter = vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "event-1",
            name: "Workspace Event",
            venue: "Court One",
            starts_at: "2026-06-24T10:00:00.000Z",
            status: "scheduled",
            event_players: [{ count: 4 }],
            matches: [{ status: "completed" }, { status: "scheduled" }],
          },
        ],
        error: null,
      }),
    }));
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: workspaceFilter,
        })),
      })),
    });

    await expect(listEvents("workspace-1")).resolves.toEqual([
      {
        id: "event-1",
        name: "Workspace Event",
        venue: "Court One",
        startsAt: "2026-06-24T10:00:00.000Z",
        status: "scheduled",
        playerCount: 4,
        completedMatches: 1,
        totalMatches: 2,
      },
    ]);
    expect(workspaceFilter).toHaveBeenCalledWith("workspace_id", "workspace-1");
  });

  it("only offers app users who belong to the active workspace", async () => {
    const appUserIdFilter = vi.fn(() => ({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "owner-user",
            email: "owner@example.com",
            display_name: "Owner",
            role: "member",
          },
        ],
        error: null,
      }),
    }));
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "workspace_memberships") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ app_user_id: "owner-user" }],
                error: null,
              }),
            })),
          };
        }
        if (table === "app_users") {
          return {
            select: vi.fn(() => ({
              in: appUserIdFilter,
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              not: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        };
      }),
    });

    await expect(listLinkableAppUsers("workspace-1")).resolves.toEqual([
      {
        id: "owner-user",
        email: "owner@example.com",
        displayName: "Owner",
        role: "member",
      },
    ]);
    expect(appUserIdFilter).toHaveBeenCalledWith("id", ["owner-user"]);
  });
});
