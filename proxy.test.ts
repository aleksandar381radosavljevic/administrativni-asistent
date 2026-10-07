import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });

describe("proxy", () => {
  it("redirects a visitor without a session to /login and remembers the page", () => {
    const response = proxy(request("/admin/procedure?status=draft"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(
      "/admin/procedure?status=draft",
    );
  });

  it("lets a request with a Supabase session cookie through, chunked or not", () => {
    for (const cookie of [
      "sb-127-auth-token=abc",
      "sb-abcdefgh-auth-token.0=abc; sb-abcdefgh-auth-token.1=def",
    ]) {
      const response = proxy(request("/admin", cookie));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("ignores unrelated cookies", () => {
    const response = proxy(request("/admin", "theme=dark"));
    expect(response.status).toBe(307);
  });
});
