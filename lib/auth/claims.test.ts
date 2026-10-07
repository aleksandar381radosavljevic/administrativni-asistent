import { describe, expect, it } from "vitest";
import { bearerToken, isAdminClaims } from "./claims";

describe("bearerToken", () => {
  it("reads the token of a Bearer header, in any case", () => {
    expect(bearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(bearerToken("bearer abc")).toBe("abc");
  });

  it("rejects other schemes and empty tokens", () => {
    expect(bearerToken("Basic dXNlcjpwYXNz")).toBeUndefined();
    expect(bearerToken("Bearer ")).toBeUndefined();
    expect(bearerToken("Bearer a b")).toBeUndefined();
  });
});

describe("isAdminClaims", () => {
  const sub = "aaaaaaaa-0000-0000-0000-000000000001";

  it("accepts app_metadata.role = admin", () => {
    expect(isAdminClaims({ sub, app_metadata: { role: "admin" } })).toBe(true);
  });

  it("rejects other roles, missing metadata and a missing subject", () => {
    expect(isAdminClaims({ sub, app_metadata: { role: "editor" } })).toBe(
      false,
    );
    expect(isAdminClaims({ sub, app_metadata: {} })).toBe(false);
    expect(isAdminClaims({ sub })).toBe(false);
    expect(isAdminClaims({ app_metadata: { role: "admin" } })).toBe(false);
  });

  it("ignores a role in user_metadata, which the user can edit", () => {
    expect(
      isAdminClaims({ sub, user_metadata: { role: "admin" } } as {
        sub: string;
      }),
    ).toBe(false);
  });
});
