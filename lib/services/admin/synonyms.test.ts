import { describe, expect, it } from "vitest";
import { quoteFilterValue } from "./synonyms";

describe("quoteFilterValue", () => {
  it("quotes the value and escapes quotes and backslashes", () => {
    expect(quoteFilterValue("%a,b(c)%")).toBe('"%a,b(c)%"');
    expect(quoteFilterValue('say "hi" \\%')).toBe('"say \\"hi\\" \\\\%"');
  });
});
