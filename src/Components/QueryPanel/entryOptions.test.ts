import { buildEntryOptions } from "./entryOptions";

describe("buildEntryOptions", () => {
  it("groups entries by root and includes recursive wildcard choices", () => {
    const options = buildEntryOptions([
      "entry",
      "entry/direct",
      "entry/branch",
      "entry/branch/nested",
      "other",
      "standalone",
    ]);

    expect(options).toEqual([
      { label: "All", options: [{ label: "*", value: "*" }] },
      {
        label: "entry",
        options: [
          { label: "entry/**", value: "entry/**" },
          { label: "entry/branch/nested", value: "entry/branch/nested" },
          { label: "entry/direct", value: "entry/direct" },
        ],
      },
      {
        label: "Other",
        options: [
          { label: "other", value: "other" },
          { label: "standalone", value: "standalone" },
        ],
      },
    ]);
    expect(options.flatMap((group) => group.options)).not.toContainEqual({
      label: "entry/*",
      value: "entry/*",
    });
  });
});
