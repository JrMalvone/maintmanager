import { beforeEach, describe, expect, it, vi } from "vitest";

const backend = vi.hoisted(() => ({
  auth: {
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    setSession: vi.fn(),
  },
  functions: { invoke: vi.fn() },
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: backend }));

import { authenticate, getAuthState, logout, validateSession } from "@/lib/auth";

describe("window-scoped login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
    backend.auth.signOut.mockResolvedValue({ error: null });
    backend.auth.setSession.mockResolvedValue({ error: null });
    backend.functions.invoke.mockResolvedValue({
      data: {
        success: true,
        role: "gestor",
        displayName: "Gestor",
        redirectTo: "/dashboard/analytics",
        session: { access_token: "test-access", refresh_token: "test-refresh" },
      },
      error: null,
    });
    backend.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "test-user" } } } });
    backend.auth.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
    backend.from.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: "manager" }, error: null }) }) }),
    });
  });

  it("requires login after closing and reopening, even if backend tokens remain", async () => {
    await authenticate("test-user", "test-password");
    expect(getAuthState().isAuthenticated).toBe(true);
    // A new software window has no sessionStorage from the closed window.
    sessionStorage.clear();
    expect((await validateSession()).isAuthenticated).toBe(false);
    expect(backend.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(backend.auth.getSession).not.toHaveBeenCalled();
    expect(getAuthState().isAuthenticated).toBe(false);
  });

  it("keeps the user logged in during navigation and reload in the same window", async () => {
    await authenticate("test-user", "test-password");
    expect(await validateSession()).toEqual({ isAuthenticated: true, role: "gestor", user: "Gestor" });
    expect(await validateSession()).toEqual({ isAuthenticated: true, role: "gestor", user: "Gestor" });
    expect(backend.auth.signOut).not.toHaveBeenCalled();
  });

  it("does not restore a legacy cached login on the first launch after the update", async () => {
    sessionStorage.setItem("cmms_session", JSON.stringify({ role: "gestor", user: "Gestor" }));
    expect(getAuthState().isAuthenticated).toBe(false);
    expect((await validateSession()).isAuthenticated).toBe(false);
    expect(sessionStorage.getItem("cmms_session")).toBeNull();
  });

  it("clears the window login permission on explicit logout", async () => {
    await authenticate("test-user", "test-password");
    await logout();
    expect(getAuthState().isAuthenticated).toBe(false);
    expect((await validateSession()).isAuthenticated).toBe(false);
    expect(backend.auth.getSession).not.toHaveBeenCalled();
  });
});