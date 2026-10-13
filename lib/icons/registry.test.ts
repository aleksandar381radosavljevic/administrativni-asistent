import { describe, expect, it } from "vitest";
import { lifeEventIconName } from "./registry";

describe("lifeEventIconName", () => {
  it("keeps a registered life event icon", () => {
    expect(lifeEventIconName("car")).toBe("car");
  });

  it.each([null, "", "rocket", "toString", "🪪"])(
    "falls back to circle-help for %j",
    (value) => {
      expect(lifeEventIconName(value)).toBe("circle-help");
    },
  );
});
