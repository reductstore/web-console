import {
  addAsLabelRow,
  addEncodeRow,
  addSection,
  buildExtPayload,
  createRosTransformStep,
  hasIncompleteTransform,
  parseExtPayload,
  removeAsLabelRow,
  removeEncodeRow,
  removeSection,
  TransformStepEntry,
  updateAsLabelRow,
  updateEncodeRow,
  updateExport,
  updateTopic,
} from "./transformStepBuilder";

describe("transformStepBuilder", () => {
  describe("createRosTransformStep", () => {
    it("defaults to no sections and blank fields", () => {
      const transform = createRosTransformStep();
      expect(transform.kind).toBe("ros");
      expect(transform.ros.sections).toEqual([]);
      expect(transform.ros.topic).toBe("");
      expect(transform.ros.encode).toEqual([]);
      expect(transform.ros.asLabel).toEqual([]);
      expect(transform.ros.export).toEqual({
        format: "",
        duration: "",
        size: "",
      });
    });
  });

  describe("addSection / removeSection", () => {
    it("adds a section and seeds encode/label with one blank row", () => {
      const transform = createRosTransformStep();
      const withEncode = addSection(transform, "encode");
      expect(withEncode.ros.sections).toEqual(["encode"]);
      expect(withEncode.ros.encode).toHaveLength(1);
      expect(withEncode.ros.encode[0]).toMatchObject({ key: "", value: "" });

      const withLabel = addSection(withEncode, "label");
      expect(withLabel.ros.sections).toEqual(["encode", "label"]);
      expect(withLabel.ros.asLabel).toHaveLength(1);
    });

    it("adding filter or export seeds no rows", () => {
      const transform = addSection(createRosTransformStep(), "filter");
      expect(transform.ros.sections).toEqual(["filter"]);
      expect(transform.ros.encode).toEqual([]);
      expect(transform.ros.asLabel).toEqual([]);
    });

    it("is a no-op if the section is already present", () => {
      const transform = addSection(createRosTransformStep(), "filter");
      const again = addSection(transform, "filter");
      expect(again).toBe(transform);
    });

    it("removes a section", () => {
      const transform = addSection(createRosTransformStep(), "filter");
      const result = removeSection(transform, "filter");
      expect(result.ros.sections).toEqual([]);
    });

    it("adding export defaults format to mcap, the only supported value", () => {
      const transform = addSection(createRosTransformStep(), "export");
      expect(transform.ros.export.format).toBe("mcap");
    });

    it("does not override an already-set export format when re-added", () => {
      let transform = addSection(createRosTransformStep(), "export");
      transform = updateExport(transform, { format: "custom" });
      transform = removeSection(transform, "export");
      transform = addSection(transform, "export");
      expect(transform.ros.export.format).toBe("custom");
    });
  });

  describe("updateTopic", () => {
    it("updates the topic", () => {
      const transform = createRosTransformStep();
      const result = updateTopic(transform, "/robot/odom");
      expect(result.ros.topic).toBe("/robot/odom");
    });
  });

  describe("updateExport", () => {
    it("merges partial changes into the export config", () => {
      const transform = createRosTransformStep();
      const result = updateExport(transform, { duration: "1m" });
      expect(result.ros.export).toEqual({
        format: "",
        duration: "1m",
        size: "",
      });
    });
  });

  describe("encode rows", () => {
    it("adds, updates, and removes rows", () => {
      const transform = addSection(createRosTransformStep(), "encode");
      const [first] = transform.ros.encode;

      const withTwo = addEncodeRow(transform);
      expect(withTwo.ros.encode).toHaveLength(2);

      const updated = updateEncodeRow(withTwo, first.id, {
        key: "data",
        value: "jpeg",
      });
      expect(updated.ros.encode[0]).toMatchObject({
        key: "data",
        value: "jpeg",
      });

      const removed = removeEncodeRow(updated, first.id);
      expect(removed.ros.encode).toHaveLength(1);
      expect(removed.ros.encode[0].id).not.toBe(first.id);
    });
  });

  describe("as_label rows", () => {
    it("adds, updates, and removes rows", () => {
      const transform = addSection(createRosTransformStep(), "label");
      const [first] = transform.ros.asLabel;

      const withTwo = addAsLabelRow(transform);
      expect(withTwo.ros.asLabel).toHaveLength(2);

      const updated = updateAsLabelRow(withTwo, first.id, {
        key: "speed",
        value: "data.speed",
      });
      expect(updated.ros.asLabel[0]).toMatchObject({
        key: "speed",
        value: "data.speed",
      });

      const removed = removeAsLabelRow(updated, first.id);
      expect(removed.ros.asLabel).toHaveLength(1);
      expect(removed.ros.asLabel[0].id).not.toBe(first.id);
    });
  });

  describe("hasIncompleteTransform", () => {
    it("is false when there is no transform", () => {
      expect(hasIncompleteTransform(undefined)).toBe(false);
    });

    it("is false with no sections added at all", () => {
      expect(hasIncompleteTransform(createRosTransformStep())).toBe(false);
    });

    it("is false for a filter section with a blank topic", () => {
      const transform = addSection(createRosTransformStep(), "filter");
      expect(hasIncompleteTransform(transform)).toBe(false);
    });

    it("is true for an encode row with only the key filled in", () => {
      let transform = addSection(createRosTransformStep(), "encode");
      transform = updateEncodeRow(transform, transform.ros.encode[0].id, {
        key: "data",
      });
      expect(hasIncompleteTransform(transform)).toBe(true);
    });

    it("is true for a label row with only the value filled in", () => {
      let transform = addSection(createRosTransformStep(), "label");
      transform = updateAsLabelRow(transform, transform.ros.asLabel[0].id, {
        value: "data.speed",
      });
      expect(hasIncompleteTransform(transform)).toBe(true);
    });

    it("is false once every row is either complete or fully blank", () => {
      let transform = addSection(createRosTransformStep(), "encode");
      transform = updateEncodeRow(transform, transform.ros.encode[0].id, {
        key: "data",
        value: "jpeg",
      });
      expect(hasIncompleteTransform(transform)).toBe(false);
    });
  });

  describe("buildExtPayload", () => {
    it("returns undefined when there is no transform", () => {
      expect(buildExtPayload(undefined)).toBeUndefined();
    });

    it("returns an empty extract when no section is added", () => {
      expect(buildExtPayload(createRosTransformStep())).toEqual({
        ros: { extract: {} },
      });
    });

    it("includes topic only when the filter section is added and filled", () => {
      let transform = addSection(createRosTransformStep(), "filter");
      expect(buildExtPayload(transform)).toEqual({ ros: { extract: {} } });

      transform = updateTopic(transform, "  /robot/odom  ");
      expect(buildExtPayload(transform)).toEqual({
        ros: { extract: { topic: "/robot/odom" } },
      });
    });

    it("builds the encode map from complete rows, dropping incomplete ones", () => {
      let transform = addSection(createRosTransformStep(), "encode");
      const [first] = transform.ros.encode;
      transform = updateEncodeRow(transform, first.id, {
        key: "data",
        value: "jpeg",
      });
      transform = addEncodeRow(transform);
      const [, partial] = transform.ros.encode;
      transform = updateEncodeRow(transform, partial.id, { key: "other" });

      expect(buildExtPayload(transform)).toEqual({
        ros: { extract: { encode: { data: "jpeg" } } },
      });
    });

    it("builds the as_label map (label name -> path)", () => {
      let transform = addSection(createRosTransformStep(), "label");
      const [first] = transform.ros.asLabel;
      transform = updateAsLabelRow(transform, first.id, {
        key: "speed",
        value: "data.speed",
      });

      expect(buildExtPayload(transform)).toEqual({
        ros: { extract: { as_label: { speed: "data.speed" } } },
      });
    });

    it("includes export fields only when the export section is added", () => {
      let transform = createRosTransformStep();
      transform = updateExport(transform, {
        format: "mcap",
        duration: "1m",
        size: "100MB",
      });
      expect(buildExtPayload(transform)).toEqual({ ros: { extract: {} } });

      transform = addSection(transform, "export");
      expect(buildExtPayload(transform)).toEqual({
        ros: {
          export: { format: "mcap", duration: "1m", size: "100MB" },
        },
      });
    });

    it("omits blank export fields", () => {
      let transform = addSection(createRosTransformStep(), "export");
      transform = updateExport(transform, { format: "", duration: "1m" });
      expect(buildExtPayload(transform)).toEqual({
        ros: { export: { duration: "1m" } },
      });
    });
  });

  describe("parseExtPayload", () => {
    it("succeeds with no transform when ext is undefined", () => {
      expect(parseExtPayload(undefined)).toEqual({ success: true });
    });

    it("rejects a non-object ext", () => {
      expect(parseExtPayload("nope").success).toBe(false);
      expect(parseExtPayload(null).success).toBe(false);
    });

    it("rejects ext missing ros", () => {
      expect(parseExtPayload({}).success).toBe(false);
    });

    it("succeeds with an empty extract and no sections", () => {
      const result = parseExtPayload({ ros: { extract: {} } });
      expect(result.success).toBe(true);
      expect(result.transform?.ros.sections).toEqual([]);
    });

    it("parses topic into the filter section", () => {
      const result = parseExtPayload({
        ros: { extract: { topic: "/robot/odom" } },
      });
      expect(result.success).toBe(true);
      expect(result.transform?.ros.sections).toEqual(["filter"]);
      expect(result.transform?.ros.topic).toBe("/robot/odom");
    });

    it("rejects a non-string topic", () => {
      expect(parseExtPayload({ ros: { extract: { topic: 5 } } }).success).toBe(
        false,
      );
    });

    it("parses encode into rows", () => {
      const result = parseExtPayload({
        ros: { extract: { encode: { data: "jpeg" } } },
      });
      expect(result.success).toBe(true);
      expect(result.transform?.ros.sections).toEqual(["encode"]);
      expect(result.transform?.ros.encode).toContainEqual(
        expect.objectContaining({ key: "data", value: "jpeg" }),
      );
    });

    it("parses as_label into rows", () => {
      const result = parseExtPayload({
        ros: { extract: { as_label: { speed: "data.speed" } } },
      });
      expect(result.success).toBe(true);
      expect(result.transform?.ros.sections).toEqual(["label"]);
      expect(result.transform?.ros.asLabel).toContainEqual(
        expect.objectContaining({ key: "speed", value: "data.speed" }),
      );
    });

    it("parses export into the export section", () => {
      const result = parseExtPayload({
        ros: {
          extract: {},
          export: { format: "mcap", duration: "1m", size: "100MB" },
        },
      });
      expect(result.success).toBe(true);
      expect(result.transform?.ros.sections).toEqual(["export"]);
      expect(result.transform?.ros.export).toEqual({
        format: "mcap",
        duration: "1m",
        size: "100MB",
      });
    });

    it("rejects a malformed export field", () => {
      expect(parseExtPayload({ ros: { export: { format: 5 } } }).success).toBe(
        false,
      );
    });

    it("round-trips through buildExtPayload", () => {
      const transform: TransformStepEntry = {
        kind: "ros",
        ros: {
          sections: ["filter", "encode", "label", "export"],
          topic: "/robot/odom",
          encode: [{ id: "e1", key: "data", value: "jpeg" }],
          asLabel: [{ id: "l1", key: "speed", value: "data.speed" }],
          export: { format: "mcap", duration: "1m", size: "100MB" },
        },
      };
      const payload = buildExtPayload(transform);
      const parsed = parseExtPayload(payload);
      expect(parsed.success).toBe(true);
      expect(buildExtPayload(parsed.transform)).toEqual(payload);
    });
  });
});
