import { describe, expect, it } from "vitest";
import { isSearchTermLongEnough } from "./search";

describe("isSearchTermLongEnough", () => {
  it.each([
    ["", false],
    ["a", false],
    ["  a  ", false],
    ["pa", true],
    ["  pasoš ", true],
  ])("%j → %s", (term, expected) => {
    expect(isSearchTermLongEnough(term)).toBe(expected);
  });
});
