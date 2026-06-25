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
  deletePlayer,
  linkPlayerAccount,
  removeWorkspaceMember,
  savePlayer,
  setPlayerAdminRole,
  setWorkspaceMemberRole,
  unlinkPlayerAccount,
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

  it("saves linked player details and workspace role together", async () => {
    const updatePlayer = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    const updateMembership = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
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
            select: vi.fn((columns: string) => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() =>
                  columns === "app_user_id"
                    ? {
                        maybeSingle: vi.fn().mockResolvedValue({
                          data: { app_user_id: "member-user" },
                          error: null,
                        }),
                      }
                    : {
                        single: vi.fn().mockResolvedValue({
                          data: {
                            id: "00000000-0000-4000-8000-000000000002",
                            app_user_id: "member-user",
                            role: "member",
                          },
                          error: null,
                        }),
                      },
                ),
              })),
            })),
            update: updateMembership,
          };
        }
        if (table === "app_users") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    email: "member@example.com",
                    display_name: "Member User",
                  },
                  error: null,
                }),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { name: "Member User" },
                  error: null,
                }),
              })),
            })),
          })),
          update: updatePlayer,
        };
      }),
    });
    const formData = new FormData();
    formData.set("id", "00000000-0000-4000-8000-000000000001");
    formData.set("name", "Member User");
    formData.set("accountEmail", "member@example.com");
    formData.set("appUserId", "00000000-0000-4000-8000-000000000003");
    formData.set("rating", "6.5");
    formData.set("isActive", "true");
    formData.set("membershipId", "00000000-0000-4000-8000-000000000002");
    formData.set("workspaceRole", "admin");

    const result = await savePlayer({ ok: false, message: "" }, formData);

    expect(result).toEqual({ ok: true, message: "Player saved." });
    expect(updatePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 6.5,
        is_active: true,
        app_user_id: "00000000-0000-4000-8000-000000000003",
      }),
    );
    expect(updateMembership).toHaveBeenCalledWith({ role: "admin" });
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
    formData.set("expiresInDays", "7");

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
    const expiryMs =
      new Date(insert.mock.calls[0][0].expires_at).getTime() - Date.now();
    expect(expiryMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
    expect(expiryMs).toBeLessThan(7.1 * 24 * 60 * 60 * 1000);
    expect(result.inviteUrl).not.toContain(insert.mock.calls[0][0].token_hash);
  });

  it("lets workspace admins delete unused players", async () => {
    const deletePlayerRow = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
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
        if (table === "event_players") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            })),
          };
        }

        return {
          delete: deletePlayerRow,
        };
      }),
    });
    const formData = new FormData();
    formData.set("id", "00000000-0000-4000-8000-000000000001");

    const result = await deletePlayer({ ok: false, message: "" }, formData);

    expect(result).toEqual({ ok: true, message: "Player deleted." });
    expect(deletePlayerRow).toHaveBeenCalled();
  });

  it("accepts a pending invite, adds membership, and switches active workspace", async () => {
    const upsertMembership = vi.fn().mockResolvedValue({ error: null });
    const insertPlayer = vi.fn().mockResolvedValue({ error: null });
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
    expect(insertPlayer).toHaveBeenCalledWith({
      workspace_id: "shared-workspace",
      name: "Member",
      account_email: "member@example.com",
      app_user_id: "member-user",
      rating: 5,
      is_active: true,
    });
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

  it("keeps open invite links reusable after a member accepts", async () => {
    const upsertMembership = vi.fn().mockResolvedValue({ error: null });
    const insertPlayer = vi.fn().mockResolvedValue({ error: null });
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
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "invite-1",
                  workspace_id: "shared-workspace",
                  invited_email: null,
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

    expect(upsertMembership).toHaveBeenCalled();
    expect(insertPlayer).toHaveBeenCalled();
    expect(updateInvite).not.toHaveBeenCalled();
    expect(cookieSet).toHaveBeenCalledWith(
      "padeltour_active_workspace_id",
      "shared-workspace",
      {
        sameSite: "lax",
        path: "/",
      },
    );
  });

  it("links a player only to an account that belongs to the active workspace", async () => {
    const updatePlayer = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    const existingLinkFilter = vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
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
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { app_user_id: "member-user" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === "app_users") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { email: "member@example.com" },
                  error: null,
                }),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: existingLinkFilter,
              })),
            })),
          })),
          update: updatePlayer,
        };
      }),
    });
    const formData = new FormData();
    formData.set("playerId", "00000000-0000-4000-8000-000000000001");
    formData.set("appUserId", "00000000-0000-4000-8000-000000000002");

    const result = await linkPlayerAccount(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({ ok: true, message: "Player account linked." });
    expect(existingLinkFilter).toHaveBeenCalledWith(
      "id",
      "00000000-0000-4000-8000-000000000001",
    );
    expect(updatePlayer).toHaveBeenCalledWith({
      app_user_id: "00000000-0000-4000-8000-000000000002",
      account_email: "member@example.com",
    });
  });

  it("does not link one account to multiple players", async () => {
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
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { app_user_id: "member-user" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        if (table === "app_users") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { email: "member@example.com" },
                  error: null,
                }),
              })),
            })),
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                neq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: "already-linked-player" },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
          update: vi.fn(),
        };
      }),
    });
    const formData = new FormData();
    formData.set("playerId", "00000000-0000-4000-8000-000000000001");
    formData.set("appUserId", "00000000-0000-4000-8000-000000000002");

    const result = await linkPlayerAccount(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "This account is already linked to another player.",
    });
  });

  it("unlinks a player account inside the active workspace", async () => {
    const updatePlayer = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
      displayName: "Owner",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({ update: updatePlayer })),
    });
    const formData = new FormData();
    formData.set("playerId", "00000000-0000-4000-8000-000000000001");

    const result = await unlinkPlayerAccount(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({ ok: true, message: "Player account unlinked." });
    expect(updatePlayer).toHaveBeenCalledWith({
      app_user_id: null,
      account_email: null,
    });
  });

  it("lets a workspace admin promote a joined member inside the active workspace", async () => {
    const updateMembership = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
      displayName: "Owner",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "00000000-0000-4000-8000-000000000001",
                  app_user_id: "member-user",
                  role: "member",
                },
                error: null,
              }),
            })),
          })),
        })),
        update: updateMembership,
      })),
    });
    const formData = new FormData();
    formData.set("membershipId", "00000000-0000-4000-8000-000000000001");
    formData.set("role", "admin");

    const result = await setWorkspaceMemberRole(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({ ok: true, message: "Workspace role updated." });
    expect(updateMembership).toHaveBeenCalledWith({ role: "admin" });
  });

  it("blocks workspace members from changing workspace roles", async () => {
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("membershipId", "00000000-0000-4000-8000-000000000001");
    formData.set("role", "admin");

    const result = await setWorkspaceMemberRole(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "Only admins can make changes.",
    });
    expect(supabaseMocks.createServerClient).not.toHaveBeenCalled();
  });

  it("does not let elevated users change owner memberships", async () => {
    const updateMembership = vi.fn();
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "admin-user",
      email: "admin@example.com",
      displayName: "Admin",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "admin",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "00000000-0000-4000-8000-000000000001",
                  app_user_id: "owner-user",
                  role: "owner",
                },
                error: null,
              }),
            })),
          })),
        })),
        update: updateMembership,
      })),
    });
    const formData = new FormData();
    formData.set("membershipId", "00000000-0000-4000-8000-000000000001");
    formData.set("role", "member");

    const result = await setWorkspaceMemberRole(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "Workspace owners cannot be changed here.",
    });
    expect(updateMembership).not.toHaveBeenCalled();
  });

  it("lets workspace admins remove non-owner members", async () => {
    const deleteMembership = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    const unlinkPlayers = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    }));
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "owner-user",
      email: "owner@example.com",
      displayName: "Owner",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "owner",
    });
    const from = vi.fn((table: string) => {
      if (table === "players") {
        return {
          update: unlinkPlayers,
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "00000000-0000-4000-8000-000000000001",
                  app_user_id: "member-user",
                  role: "member",
                },
                error: null,
              }),
            })),
          })),
        })),
        delete: deleteMembership,
      };
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from,
    });
    const formData = new FormData();
    formData.set("membershipId", "00000000-0000-4000-8000-000000000001");

    const result = await removeWorkspaceMember(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({ ok: true, message: "Member removed." });
    expect(unlinkPlayers).toHaveBeenCalledWith({ app_user_id: null });
    expect(deleteMembership).toHaveBeenCalled();
  });

  it("does not let elevated users remove owners or themselves", async () => {
    const deleteMembership = vi.fn();
    supabaseMocks.requireWorkspaceAdminUser.mockResolvedValue({
      id: "admin-user",
      email: "admin@example.com",
      displayName: "Admin",
      role: "member",
      activeWorkspaceId: "workspace-1",
      activeWorkspaceRole: "admin",
    });
    supabaseMocks.createServerClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "00000000-0000-4000-8000-000000000001",
                  app_user_id: "admin-user",
                  role: "admin",
                },
                error: null,
              }),
            })),
          })),
        })),
        delete: deleteMembership,
      })),
    });
    const formData = new FormData();
    formData.set("membershipId", "00000000-0000-4000-8000-000000000001");

    const result = await removeWorkspaceMember(
      { ok: false, message: "" },
      formData,
    );

    expect(result).toEqual({
      ok: false,
      message: "You cannot remove yourself.",
    });
    expect(deleteMembership).not.toHaveBeenCalled();
  });
});
