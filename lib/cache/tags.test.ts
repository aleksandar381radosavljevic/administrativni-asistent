import { describe, expect, it } from "vitest";
import { writeTags } from "./tags";

describe("writeTags", () => {
  it("always includes the catalog and deduplicates entity tags", () => {
    expect(
      writeTags({
        lifeEventIds: ["e1", "e1"],
        procedureIds: ["p1"],
        institutionIds: ["i1"],
      }),
    ).toEqual(["catalog", "life-event:e1", "procedure:p1", "institution:i1"]);
    expect(writeTags({})).toEqual(["catalog"]);
  });
});
