import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: supabaseMocks.createServerClient,
  isSupabaseConfigured: () => true,
}));

import { canViewPrivateData, listPlayers } from "@/lib/data";

describe("private data access", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
  });

  it("allows admin roles without requiring a linked player", async () => {
    supabaseMocks.createServerClient.mockReturnValue({});

    await expect(
      canViewPrivateData({ id: "admin-user", role: "super_admin" }),
    ).resolves.toBe(true);
  });

  it("blocks unlinked members from private data", async () => {
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    });

    await expect(
      canViewPrivateData({ id: "member-user", role: "member" }),
    ).resolves.toBe(false);
  });

  it("allows linked members to view private data", async () => {
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: "player-1" }, error: null }),
          })),
        })),
      })),
    });

    await expect(
      canViewPrivateData({ id: "member-user", role: "member" }),
    ).resolves.toBe(true);
  });

  it("falls back to account email when app_user_id is not migrated yet", async () => {
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string) => ({
            maybeSingle: vi.fn().mockResolvedValue(
              field === "app_user_id"
                ? {
                    data: null,
                    error: { code: "42703", message: "column missing" },
                  }
                : { data: { id: "player-1" }, error: null },
            ),
          })),
        })),
      })),
    });

    await expect(
      canViewPrivateData({
        id: "member-user",
        email: "member@example.com",
        role: "member",
      }),
    ).resolves.toBe(true);
  });
});

describe("player reads", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
  });

  it("loads players through account_email when app_user_id is not migrated yet", async () => {
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "app_users") {
          return {
            select: vi.fn(() => ({
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "user-1",
                    email: "member@example.com",
                    display_name: "Member",
                    role: "member",
                  },
                ],
                error: null,
              }),
            })),
          };
        }

        return {
          select: vi.fn((columns: string) => ({
            order: vi.fn(() => ({
              order: vi.fn().mockResolvedValue(
                columns.includes("app_user_id")
                  ? {
                      data: null,
                      error: { code: "42703", message: "column missing" },
                    }
                  : {
                      data: [
                        {
                          id: "player-1",
                          name: "Linked Player",
                          account_email: "member@example.com",
                          rating: 6.5,
                          is_active: true,
                        },
                      ],
                      error: null,
                    },
              ),
            })),
          })),
        };
      }),
    });

    await expect(listPlayers()).resolves.toEqual([
      {
        id: "player-1",
        name: "Linked Player",
        appUserId: "user-1",
        accountEmail: "member@example.com",
        accountDisplayName: "Member",
        accountRole: "member",
        rating: 6.5,
        isActive: true,
      },
    ]);
  });
});
