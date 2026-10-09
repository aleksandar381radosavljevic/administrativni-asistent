import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/user", () => ({ createSessionClient: vi.fn() }));

const { createSessionClient } = await import("@/lib/supabase/user");
const { signIn, signInSchema } = await import("./session");

const credentials = { email: "admin@example.test", password: "tajna" };

function fakeAuth(options: { signedIn: boolean; role?: string }) {
  const auth = {
    signInWithPassword: vi
      .fn()
      .mockResolvedValue(
        options.signedIn
          ? { data: { session: {} }, error: null }
          : { data: { session: null }, error: new Error("Invalid login") },
      ),
    getClaims: vi.fn().mockResolvedValue({
      data: {
        claims: {
          sub: "aaaaaaaa-0000-0000-0000-000000000001",
          app_metadata: { role: options.role },
        },
      },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  vi.mocked(createSessionClient).mockResolvedValue({ auth } as never);
  return auth;
}

beforeEach(() => vi.clearAllMocks());

describe("signIn", () => {
  it("keeps the session of an admin", async () => {
    const auth = fakeAuth({ signedIn: true, role: "admin" });
    expect(await signIn(credentials)).toEqual({ ok: true });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("reports wrong credentials without saying which part was wrong", async () => {
    fakeAuth({ signedIn: false });
    expect(await signIn(credentials)).toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
  });

  it("signs a non-admin account out again", async () => {
    const auth = fakeAuth({ signedIn: true, role: "editor" });
    expect(await signIn(credentials)).toEqual({
      ok: false,
      reason: "not_admin",
    });
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe("signInSchema", () => {
  it("requires an email and a password", () => {
    expect(signInSchema.safeParse(credentials).success).toBe(true);
    expect(
      signInSchema.safeParse({ email: "nije-email", password: "x" }).success,
    ).toBe(false);
    expect(
      signInSchema.safeParse({ email: credentials.email, password: "" })
        .success,
    ).toBe(false);
  });
});
