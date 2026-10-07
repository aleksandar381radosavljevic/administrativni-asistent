import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { revalidateTag } = await import("next/cache");
const { revalidateTags } = await import("./revalidate");

describe("revalidateTags", () => {
  it("expires each tag once, immediately (UF-09)", () => {
    revalidateTags(["catalog", "life-event:e1", "catalog"]);
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([
      ["catalog", { expire: 0 }],
      ["life-event:e1", { expire: 0 }],
    ]);
  });
});
