import { buildEntryOptions } from "./entryOptions";

describe("buildEntryOptions", () => {
  it("uses a recursive wildcard for grouped entries", () => {
    const options = buildEntryOptions([
      "entry",
      "entry/direct",
      "entry/branch",
      "entry/branch/nested",
      "other",
    ]);

    expect(options).toContainEqual({ label: "entry/**", value: "entry/**" });
    expect(options).not.toContainEqual({ label: "entry/*", value: "entry/*" });
  });
});
