import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  requireAdminUser: vi.fn(),
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
}));

import { savePlayer } from "@/app/actions";

describe("RBAC server actions", () => {
  beforeEach(() => {
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.requireAdminUser.mockReset();
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
});
