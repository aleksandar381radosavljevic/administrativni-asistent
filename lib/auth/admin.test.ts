import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/supabase/user", () => ({
  createSessionClient: vi.fn(),
  createUserClient: vi.fn(),
}));

const { createSessionClient, createUserClient } =
  await import("@/lib/supabase/user");
const { requireAdmin } = await import("./admin");

const ADMIN = "aaaaaaaa-0000-0000-0000-000000000001";

function fakeClient(result: { data: unknown; error: unknown }) {
  const getClaims = vi.fn().mockResolvedValue(result);
  return { client: { auth: { getClaims } }, getClaims };
}

const claims = (appMetadata: object) => ({
  data: { claims: { sub: ADMIN, app_metadata: appMetadata } },
  error: null,
});

const request = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/v1/admin/life-events", { headers });

async function statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
    return 200;
  } catch (error) {
    return (error as ApiError).status;
  }
}

beforeEach(() => vi.clearAllMocks());

describe("requireAdmin", () => {
  it("verifies a Bearer token and returns a client acting as the admin", async () => {
    const { client, getClaims } = fakeClient(claims({ role: "admin" }));
    vi.mocked(createUserClient).mockReturnValue(client as never);
    const context = await requireAdmin(
      request({ authorization: "Bearer token-1" }),
    );
    expect(createUserClient).toHaveBeenCalledWith("token-1");
    expect(getClaims).toHaveBeenCalledWith("token-1");
    expect(context).toEqual({ client, userId: ADMIN });
    expect(createSessionClient).not.toHaveBeenCalled();
  });

  it("falls back to the session cookie without an Authorization header", async () => {
    const { client, getClaims } = fakeClient(claims({ role: "admin" }));
    vi.mocked(createSessionClient).mockResolvedValue(client as never);
    await requireAdmin(request());
    expect(getClaims).toHaveBeenCalledWith(undefined);
    expect(createUserClient).not.toHaveBeenCalled();
  });

  it("returns 401 for a malformed Authorization header", async () => {
    expect(
      await statusOf(requireAdmin(request({ authorization: "Basic abc" }))),
    ).toBe(401);
    expect(createUserClient).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no session or the token does not verify", async () => {
    const { client } = fakeClient({
      data: null,
      error: new Error("invalid JWT"),
    });
    vi.mocked(createSessionClient).mockResolvedValue(client as never);
    vi.mocked(createUserClient).mockReturnValue(client as never);
    expect(await statusOf(requireAdmin(request()))).toBe(401);
    expect(
      await statusOf(requireAdmin(request({ authorization: "Bearer x" }))),
    ).toBe(401);
  });

  it("returns 403 for a valid token without the admin claim", async () => {
    const { client } = fakeClient(claims({ role: "editor" }));
    vi.mocked(createUserClient).mockReturnValue(client as never);
    expect(
      await statusOf(requireAdmin(request({ authorization: "Bearer x" }))),
    ).toBe(403);
  });
});
