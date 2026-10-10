import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "./errors";
import { handle, parseBody, parseId } from "./handler";

const schema = z.object({
  title: z.string().trim().min(1).max(5),
  slug: z.string(),
  steps: z.array(z.string()).min(1, "Bar jedan korak."),
});

const post = (body: string) =>
  new Request("http://localhost/x", { method: "POST", body });

async function failure(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected a rejection");
}

describe("handle", () => {
  it("answers an ApiError with its contract body", async () => {
    const response = await handle(async () => {
      throw ApiError.notFound();
    });
    expect(response.status).toBe(404);
  });

  it("hides an unexpected error behind a 500", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handle(async () => {
      throw new Error("boom");
    });
    expect(response.status).toBe(500);
    log.mockRestore();
  });

  it("lets Next.js control-flow errors through to Next.js", async () => {
    await expect(handle(async () => redirect("/elsewhere"))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
  });
});

describe("parseBody", () => {
  it("returns the parsed body", async () => {
    expect(
      await parseBody(
        schema,
        post('{"title":" Ok ","slug":"ok","steps":["a"]}'),
      ),
    ).toEqual({ title: "Ok", slug: "ok", steps: ["a"] });
  });

  it("answers a body that is not JSON with 400", async () => {
    const error = await failure(parseBody(schema, post("{nope")));
    expect([error.status, error.code]).toEqual([400, "bad_request"]);
  });

  it("lists every invalid field in Serbian with 422", async () => {
    const error = await failure(
      parseBody(schema, post('{"title":"predugo","steps":[]}')),
    );
    expect(error.status).toBe(422);
    expect(error.toBody()).toEqual({
      error: "validation_error",
      message: "Proveri označena polja.",
      details: [
        { field: "title", message: "Vrednost je predugačka." },
        { field: "slug", message: "Ovo polje je obavezno." },
        { field: "steps", message: "Bar jedan korak." },
      ],
    });
  });

  it("reports a non-object body against the whole body", async () => {
    const error = await failure(parseBody(schema, post("[]")));
    expect(error.details).toEqual([
      { field: "body", message: "Vrednost nije odgovarajućeg tipa." },
    ]);
  });
});

describe("parseId", () => {
  it("accepts a uuid and lowercases it", () => {
    expect(parseId("D0000000-0000-0000-0000-00000000000A")).toBe(
      "d0000000-0000-0000-0000-00000000000a",
    );
  });

  it("treats a malformed id as not found", () => {
    expect(() => parseId("123")).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
});
