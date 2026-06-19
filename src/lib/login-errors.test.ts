import { describe, expect, it } from "vitest";

import { formatLoginErrorMessage } from "@/lib/login-errors";

describe("login error formatting", () => {
  it("returns friendly copy for known login errors", () => {
    expect(formatLoginErrorMessage("auth-not-configured")).toBe(
      "Authentication is not configured.",
    );
    expect(formatLoginErrorMessage("google-sign-in-failed")).toBe(
      "Google sign in failed.",
    );
  });

  it("humanizes unknown error ids", () => {
    expect(formatLoginErrorMessage("token-refresh-expired")).toBe(
      "Token refresh expired.",
    );
  });

  it("returns null when there is no error", () => {
    expect(formatLoginErrorMessage(undefined)).toBeNull();
  });
});
