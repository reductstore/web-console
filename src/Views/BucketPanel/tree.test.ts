import { EntryInfo } from "reduct-js";
import { buildEntryTree } from "./tree";

describe("buildEntryTree", () => {
  const entry = (name: string) => ({ name }) as EntryInfo;

  it("should build nested tree from slash-separated names", () => {
    const tree = buildEntryTree([
      entry("sensor"),
      entry("sensor/humidity"),
      entry("sensor/temperature"),
      entry("camera/front/rgb"),
      entry("flat-entry"),
    ]);

    expect(tree.map((n) => n.key)).toEqual(["camera", "flat-entry", "sensor"]);

    const sensor = tree.find((n) => n.key === "sensor");
    expect(sensor?.children.map((n) => n.key)).toEqual([
      "sensor/humidity",
      "sensor/temperature",
    ]);

    const camera = tree.find((n) => n.key === "camera");
    expect(camera?.children[0].key).toBe("camera/front");
    expect(camera?.children[0].children[0].key).toBe("camera/front/rgb");
  });

  it("should keep deterministic sort order", () => {
    const tree = buildEntryTree([
      entry("z/k"),
      entry("a/b"),
      entry("a/a"),
      entry("z/a"),
    ]);

    expect(tree.map((n) => n.key)).toEqual(["a", "z"]);
    expect(tree[0].children.map((n) => n.key)).toEqual(["a/a", "a/b"]);
    expect(tree[1].children.map((n) => n.key)).toEqual(["z/a", "z/k"]);
  });

  it("should keep mixed leaf and branch for the same root", () => {
    const tree = buildEntryTree([entry("sensor"), entry("sensor/humidity")]);

    const sensor = tree.find((n) => n.key === "sensor");
    expect(sensor).toBeTruthy();
    expect(sensor?.children.map((n) => n.key)).toEqual(["sensor/humidity"]);
  });
});
