import {
  addAsLabelRow,
  addEncodeRow,
  addFormatSection,
  addProtobufFieldRow,
  addSection,
  buildExtPayload,
  changeFormat,
  createRosTransformStep,
  createSelectTransformStep,
  hasIncompleteTransform,
  parseExtPayload,
  removeAsLabelRow,
  removeEncodeRow,
  removeFormatSection,
  removeProtobufFieldRow,
  removeSection,
  TransformStepEntry,
  updateAsLabelRow,
  updateCsv,
  updateEncodeRow,
  updateExport,
  updateProtobuf,
  updateProtobufFieldRow,
  updateSelectExport,
  updateSqlStep,
  updateTopic,
} from "./transformStepBuilder";

function expectRos(
  transforms: TransformStepEntry[] | undefined,
): Extract<TransformStepEntry, { kind: "ros" }> {
  const transform = transforms?.find((t) => t.kind === "ros");
  if (!transform) throw new Error("expected a ros transform");
  return transform;
}

function expectSelect(
  transforms: TransformStepEntry[] | undefined,
): Extract<TransformStepEntry, { kind: "select" }> {
  const transform = transforms?.find((t) => t.kind === "select");
  if (!transform) throw new Error("expected a select transform");
  return transform;
}

function blankSelectTransform() {
  const transform = createSelectTransformStep();
  return updateSqlStep(transform, transform.select.sqlSteps[0].id, "");
}

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

      const withTwo = addAsLabelRow(transform, undefined);
      expect(withTwo.ros.asLabel).toHaveLength(2);

      const updated = updateAsLabelRow(withTwo, undefined, first.id, {
        key: "speed",
        value: "data.speed",
      });
      expect(updated.ros.asLabel[0]).toMatchObject({
        key: "speed",
        value: "data.speed",
      });

      const removed = removeAsLabelRow(updated, undefined, first.id);
      expect(removed.ros.asLabel).toHaveLength(1);
      expect(removed.ros.asLabel[0].id).not.toBe(first.id);
    });
  });

  describe("hasIncompleteTransform", () => {
    it("is false when there is no transform", () => {
      expect(hasIncompleteTransform([])).toBe(false);
    });

    it("is false with no sections added at all", () => {
      expect(hasIncompleteTransform([createRosTransformStep()])).toBe(false);
    });

    it("is false for a filter section with a blank topic", () => {
      const transform = addSection(createRosTransformStep(), "filter");
      expect(hasIncompleteTransform([transform])).toBe(false);
    });

    it("is true for an encode row with only the key filled in", () => {
      let transform = addSection(createRosTransformStep(), "encode");
      transform = updateEncodeRow(transform, transform.ros.encode[0].id, {
        key: "data",
      });
      expect(hasIncompleteTransform([transform])).toBe(true);
    });

    it("is true for a label row with only the value filled in", () => {
      let transform = addSection(createRosTransformStep(), "label");
      transform = updateAsLabelRow(
        transform,
        undefined,
        transform.ros.asLabel[0].id,
        { value: "data.speed" },
      );
      expect(hasIncompleteTransform([transform])).toBe(true);
    });

    it("is false once every row is either complete or fully blank", () => {
      let transform = addSection(createRosTransformStep(), "encode");
      transform = updateEncodeRow(transform, transform.ros.encode[0].id, {
        key: "data",
        value: "jpeg",
      });
      expect(hasIncompleteTransform([transform])).toBe(false);
    });
  });

  describe("buildExtPayload", () => {
    it("returns undefined when there is no transform", () => {
      expect(buildExtPayload([])).toBeUndefined();
    });

    it("returns an empty extract when no section is added", () => {
      expect(buildExtPayload([createRosTransformStep()])).toEqual([
        { ros: { extract: {} } },
      ]);
    });

    it("includes topic only when the filter section is added and filled", () => {
      let transform = addSection(createRosTransformStep(), "filter");
      expect(buildExtPayload([transform])).toEqual([{ ros: { extract: {} } }]);

      transform = updateTopic(transform, "  /robot/odom  ");
      expect(buildExtPayload([transform])).toEqual([
        { ros: { extract: { topic: "/robot/odom" } } },
      ]);
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

      expect(buildExtPayload([transform])).toEqual([
        { ros: { extract: { encode: { data: "jpeg" } } } },
      ]);
    });

    it("builds the as_label map (label name -> path)", () => {
      let transform = addSection(createRosTransformStep(), "label");
      const [first] = transform.ros.asLabel;
      transform = updateAsLabelRow(transform, undefined, first.id, {
        key: "speed",
        value: "data.speed",
      });

      expect(buildExtPayload([transform])).toEqual([
        { ros: { extract: { as_label: { speed: "data.speed" } } } },
      ]);
    });

    it("includes export fields only when the export section is added", () => {
      let transform = createRosTransformStep();
      transform = updateExport(transform, {
        format: "mcap",
        duration: "1m",
        size: "100MB",
      });
      expect(buildExtPayload([transform])).toEqual([{ ros: { extract: {} } }]);

      transform = addSection(transform, "export");
      expect(buildExtPayload([transform])).toEqual([
        {
          ros: { export: { format: "mcap", duration: "1m", size: "100MB" } },
        },
      ]);
    });

    it("omits blank export fields", () => {
      let transform = addSection(createRosTransformStep(), "export");
      transform = updateExport(transform, { format: "", duration: "1m" });
      expect(buildExtPayload([transform])).toEqual([
        { ros: { export: { duration: "1m" } } },
      ]);
    });

    it("keeps an empty ros.export when the section is present but every field is blank", () => {
      let transform = addSection(createRosTransformStep(), "export");
      transform = updateExport(transform, { format: "" });
      expect(buildExtPayload([transform])).toEqual([{ ros: { export: {} } }]);
    });
  });

  describe("parseExtPayload", () => {
    it("succeeds with no transform when ext is undefined", () => {
      expect(parseExtPayload(undefined)).toEqual({
        success: true,
        transforms: [],
      });
    });

    it("rejects a non-object ext", () => {
      expect(parseExtPayload("nope").success).toBe(false);
      expect(parseExtPayload(null).success).toBe(false);
    });

    it("rejects ext missing ros", () => {
      expect(parseExtPayload({}).success).toBe(false);
    });

    it("rejects an array in place of ros, extract, or export", () => {
      expect(parseExtPayload({ ros: [] }).success).toBe(false);
      expect(parseExtPayload({ ros: { extract: [] } }).success).toBe(false);
      expect(parseExtPayload({ ros: { export: [] } }).success).toBe(false);
    });

    it("succeeds with an empty extract and no sections", () => {
      const result = parseExtPayload({ ros: { extract: {} } });
      expect(result.success).toBe(true);
      expect(expectRos(result.transforms).ros.sections).toEqual([]);
    });

    it("parses an empty export object into the export section", () => {
      const result = parseExtPayload({ ros: { export: {} } });
      expect(result.success).toBe(true);
      expect(expectRos(result.transforms).ros.sections).toEqual(["export"]);
    });

    it("parses topic into the filter section", () => {
      const result = parseExtPayload({
        ros: { extract: { topic: "/robot/odom" } },
      });
      expect(result.success).toBe(true);
      expect(expectRos(result.transforms).ros.sections).toEqual(["filter"]);
      expect(expectRos(result.transforms).ros.topic).toBe("/robot/odom");
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
      expect(expectRos(result.transforms).ros.sections).toEqual(["encode"]);
      expect(expectRos(result.transforms).ros.encode).toContainEqual(
        expect.objectContaining({ key: "data", value: "jpeg" }),
      );
    });

    it("parses as_label into rows", () => {
      const result = parseExtPayload({
        ros: { extract: { as_label: { speed: "data.speed" } } },
      });
      expect(result.success).toBe(true);
      expect(expectRos(result.transforms).ros.sections).toEqual(["label"]);
      expect(expectRos(result.transforms).ros.asLabel).toContainEqual(
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
      expect(expectRos(result.transforms).ros.sections).toEqual(["export"]);
      expect(expectRos(result.transforms).ros.export).toEqual({
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
      const payload = buildExtPayload([transform]);
      const parsed = parseExtPayload(payload);
      expect(parsed.success).toBe(true);
      expect(buildExtPayload(parsed.transforms ?? [])).toEqual(payload);
    });
  });

  describe("select transform", () => {
    function firstStepId(
      transform: Extract<TransformStepEntry, { kind: "select" }>,
    ): string {
      return transform.select.sqlSteps[0].id;
    }

    describe("createSelectTransformStep", () => {
      it("defaults to SELECT * FROM ENTRY() and no as_label rows", () => {
        const transform = createSelectTransformStep();
        expect(transform.kind).toBe("select");
        expect(transform.select.sqlSteps).toHaveLength(1);
        expect(transform.select.sqlSteps[0]).toMatchObject({
          sql: "SELECT * FROM ENTRY()\n",
          asLabel: [],
        });
      });
    });

    describe("updateSqlStep", () => {
      it("updates the sql expression", () => {
        const initial = createSelectTransformStep();
        const transform = updateSqlStep(
          initial,
          initial.select.sqlSteps[0].id,
          "SELECT * FROM ENTRY()",
        );
        expect(transform.select.sqlSteps[0].sql).toBe("SELECT * FROM ENTRY()");
      });
    });

    describe("as_label rows", () => {
      it("adds, updates, and removes rows", () => {
        const initial = createSelectTransformStep();
        const transform = addAsLabelRow(initial, firstStepId(initial));
        expect(transform.select.sqlSteps[0].asLabel).toHaveLength(1);
        const [first] = transform.select.sqlSteps[0].asLabel;

        const updated = updateAsLabelRow(
          transform,
          firstStepId(transform),
          first.id,
          { key: "speed", value: "vector.x" },
        );
        expect(updated.select.sqlSteps[0].asLabel[0]).toMatchObject({
          key: "speed",
          value: "vector.x",
        });

        const removed = removeAsLabelRow(
          updated,
          firstStepId(updated),
          first.id,
        );
        expect(removed.select.sqlSteps[0].asLabel).toHaveLength(0);
      });
    });

    describe("hasIncompleteTransform", () => {
      it("is false with a blank sql and no as_label rows", () => {
        expect(hasIncompleteTransform([createSelectTransformStep()])).toBe(
          false,
        );
      });

      it("is true for a partially filled as_label row", () => {
        const initial = createSelectTransformStep();
        let transform = addAsLabelRow(initial, firstStepId(initial));
        transform = updateAsLabelRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].asLabel[0].id,
          { key: "speed" },
        );
        expect(hasIncompleteTransform([transform])).toBe(true);
      });

      it("is false once the as_label row is complete", () => {
        const initial = createSelectTransformStep();
        let transform = addAsLabelRow(initial, firstStepId(initial));
        transform = updateAsLabelRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].asLabel[0].id,
          { key: "speed", value: "vector.x" },
        );
        expect(hasIncompleteTransform([transform])).toBe(false);
      });
    });

    describe("buildExtPayload", () => {
      it("includes the default sql when nothing else is filled in", () => {
        expect(buildExtPayload([createSelectTransformStep()])).toEqual([
          { select: { sql: "SELECT * FROM ENTRY()" } },
        ]);
      });

      it("returns an empty select stage when sql is also blank", () => {
        expect(buildExtPayload([blankSelectTransform()])).toEqual([
          { select: {} },
        ]);
      });

      it("includes sql only when non-blank", () => {
        const initial = createSelectTransformStep();
        const transform = updateSqlStep(
          initial,
          initial.select.sqlSteps[0].id,
          "  SELECT * FROM ENTRY()  ",
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { sql: "SELECT * FROM ENTRY()" } },
        ]);
      });

      it("builds the as_label map, dropping incomplete rows", () => {
        const initial = blankSelectTransform();
        let transform = addAsLabelRow(initial, firstStepId(initial));
        transform = updateAsLabelRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].asLabel[0].id,
          { key: "speed", value: "vector.x" },
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { as_label: { speed: "vector.x" } } },
        ]);
      });

      it("includes both sql and as_label when both are filled", () => {
        const initial = createSelectTransformStep();
        let transform = updateSqlStep(
          initial,
          initial.select.sqlSteps[0].id,
          "SELECT * FROM ENTRY()",
        );
        transform = addAsLabelRow(transform, firstStepId(transform));
        transform = updateAsLabelRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].asLabel[0].id,
          { key: "speed", value: "vector.x" },
        );
        expect(buildExtPayload([transform])).toEqual([
          {
            select: {
              sql: "SELECT * FROM ENTRY()",
              as_label: { speed: "vector.x" },
            },
          },
        ]);
      });
    });

    describe("parseExtPayload", () => {
      it("rejects a non-object select", () => {
        expect(parseExtPayload({ select: [] }).success).toBe(false);
      });

      it("rejects a non-string sql", () => {
        expect(parseExtPayload({ select: { sql: 5 } }).success).toBe(false);
      });

      it("rejects an array in place of as_label", () => {
        expect(parseExtPayload({ select: { as_label: [] } }).success).toBe(
          false,
        );
      });

      it("succeeds with an empty select object", () => {
        const result = parseExtPayload({ select: {} });
        expect(result.success).toBe(true);
        expect(expectSelect(result.transforms).select.sqlSteps).toEqual([
          {
            id: expect.any(String),
            sql: "",
            asLabel: [],
            formatSections: [],
            csv: { hasHeaders: false },
            protobuf: { messageName: "", schema: "", fields: [] },
            export: { format: "", rows: "", duration: "" },
          },
        ]);
      });

      it("parses sql and as_label", () => {
        const result = parseExtPayload({
          select: {
            sql: "SELECT * FROM ENTRY()",
            as_label: { speed: "vector.x" },
          },
        });
        expect(result.success).toBe(true);
        const [step] = expectSelect(result.transforms).select.sqlSteps;
        expect(step.sql).toBe("SELECT * FROM ENTRY()");
        expect(step.asLabel).toContainEqual(
          expect.objectContaining({ key: "speed", value: "vector.x" }),
        );
      });

      it("round-trips through buildExtPayload", () => {
        const transform: TransformStepEntry = {
          kind: "select",
          select: {
            sqlSteps: [
              {
                id: "s1",
                sql: "SELECT * FROM ENTRY()",
                asLabel: [{ id: "l1", key: "speed", value: "vector.x" }],
                formatSections: [],
                csv: { hasHeaders: false },
                protobuf: { messageName: "", schema: "", fields: [] },
                export: { format: "", rows: "", duration: "" },
              },
            ],
          },
        };
        const payload = buildExtPayload([transform]);
        const parsed = parseExtPayload(payload);
        expect(parsed.success).toBe(true);
        expect(buildExtPayload(parsed.transforms ?? [])).toEqual(payload);
      });
    });

    describe("format sections", () => {
      it("adds and removes a format section", () => {
        const initial = createSelectTransformStep();
        const transform = addFormatSection(
          initial,
          firstStepId(initial),
          "csv",
        );
        expect(transform.select.sqlSteps[0].formatSections).toEqual(["csv"]);
        const removed = removeFormatSection(
          transform,
          firstStepId(transform),
          "csv",
        );
        expect(removed.select.sqlSteps[0].formatSections).toEqual([]);
      });

      it("is a no-op if the section is already present", () => {
        const initial = createSelectTransformStep();
        const transform = addFormatSection(
          initial,
          firstStepId(initial),
          "json",
        );
        const again = addFormatSection(
          transform,
          firstStepId(transform),
          "json",
        );
        expect(again).toBe(transform);
      });
    });

    describe("changeFormat", () => {
      it("replaces the active csv/json/parquet format in a single call", () => {
        const initial = createSelectTransformStep();
        const withCsv = addFormatSection(initial, firstStepId(initial), "csv");
        const withJson = changeFormat(withCsv, firstStepId(withCsv), "json");
        expect(withJson.select.sqlSteps[0].formatSections).toEqual(["json"]);
      });

      it("leaves export untouched but replaces protobuf", () => {
        const initial = createSelectTransformStep();
        const withProtobuf = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        const withExport = addFormatSection(
          withProtobuf,
          firstStepId(withProtobuf),
          "export",
        );
        const changed = changeFormat(
          withExport,
          firstStepId(withExport),
          "parquet",
        );
        expect(changed.select.sqlSteps[0].formatSections).toEqual([
          "export",
          "parquet",
        ]);
      });

      it("is a single mutation even when no format was active yet", () => {
        const initial = createSelectTransformStep();
        const changed = changeFormat(initial, firstStepId(initial), "csv");
        expect(changed.select.sqlSteps[0].formatSections).toEqual(["csv"]);
      });

      it("seeds a blank field row when switching to protobuf with none yet", () => {
        const initial = createSelectTransformStep();
        const changed = changeFormat(initial, firstStepId(initial), "protobuf");
        expect(changed.select.sqlSteps[0].protobuf.fields).toHaveLength(1);
      });

      it("does not duplicate existing protobuf field rows when switching back", () => {
        const initial = createSelectTransformStep();
        let transform = changeFormat(initial, firstStepId(initial), "protobuf");
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = changeFormat(transform, firstStepId(transform), "csv");
        transform = changeFormat(transform, firstStepId(transform), "protobuf");
        expect(transform.select.sqlSteps[0].protobuf.fields).toHaveLength(2);
      });
    });

    describe("updateCsv", () => {
      it("updates hasHeaders", () => {
        const initial = createSelectTransformStep();
        const transform = updateCsv(initial, firstStepId(initial), {
          hasHeaders: true,
        });
        expect(transform.select.sqlSteps[0].csv.hasHeaders).toBe(true);
      });
    });

    describe("protobuf config", () => {
      it("updates messageName and schema", () => {
        const initial = createSelectTransformStep();
        const transform = updateProtobuf(initial, firstStepId(initial), {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        expect(transform.select.sqlSteps[0].protobuf.messageName).toBe(
          "pkg.SensorReading",
        );
        expect(transform.select.sqlSteps[0].protobuf.schema).toBe("base64==");
      });

      it("adds, updates, and removes field rows", () => {
        const initial = createSelectTransformStep();
        const transform = addProtobufFieldRow(initial, firstStepId(initial));
        expect(transform.select.sqlSteps[0].protobuf.fields).toHaveLength(1);
        const [first] = transform.select.sqlSteps[0].protobuf.fields;

        const updated = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          first.id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        expect(updated.select.sqlSteps[0].protobuf.fields[0]).toMatchObject({
          column: "device_id",
          fieldId: "1",
          fieldType: "string",
        });

        const removed = removeProtobufFieldRow(
          updated,
          firstStepId(updated),
          first.id,
        );
        expect(removed.select.sqlSteps[0].protobuf.fields).toHaveLength(0);
      });
    });

    describe("updateSelectExport", () => {
      it("merges partial changes into the export config", () => {
        const initial = createSelectTransformStep();
        const transform = updateSelectExport(initial, firstStepId(initial), {
          format: "parquet",
        });
        expect(transform.select.sqlSteps[0].export).toEqual({
          format: "parquet",
          rows: "",
          duration: "",
        });
      });
    });

    describe("hasIncompleteTransform (protobuf fields)", () => {
      it("is false when protobuf isn't an active format section", () => {
        const initial = createSelectTransformStep();
        let transform = addProtobufFieldRow(initial, firstStepId(initial));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(hasIncompleteTransform([transform])).toBe(false);
      });

      it("is true for a partially filled field row once protobuf is active", () => {
        const initial = createSelectTransformStep();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(hasIncompleteTransform([transform])).toBe(true);
      });

      it("is false once the field row is fully filled", () => {
        const initial = createSelectTransformStep();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        expect(hasIncompleteTransform([transform])).toBe(false);
      });
    });

    describe("buildExtPayload (input formats and export)", () => {
      it("includes csv with has_headers", () => {
        const initial = blankSelectTransform();
        let transform = addFormatSection(initial, firstStepId(initial), "csv");
        transform = updateCsv(transform, firstStepId(transform), {
          hasHeaders: true,
        });
        expect(buildExtPayload([transform])).toEqual([
          { select: { csv: { has_headers: true } } },
        ]);
      });

      it("includes an empty json object", () => {
        const initial = blankSelectTransform();
        const transform = addFormatSection(
          initial,
          firstStepId(initial),
          "json",
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { json: {} } },
        ]);
      });

      it("includes an empty parquet object", () => {
        const initial = blankSelectTransform();
        const transform = addFormatSection(
          initial,
          firstStepId(initial),
          "parquet",
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { parquet: {} } },
        ]);
      });

      it("builds protobuf from message_name/schema when no field rows are complete", () => {
        const initial = blankSelectTransform();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = updateProtobuf(transform, firstStepId(transform), {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        expect(buildExtPayload([transform])).toEqual([
          {
            select: {
              protobuf: {
                message_name: "pkg.SensorReading",
                schema: "base64==",
              },
            },
          },
        ]);
      });

      it("prefers complete field rows over message_name/schema", () => {
        const initial = blankSelectTransform();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = updateProtobuf(transform, firstStepId(transform), {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        expect(buildExtPayload([transform])).toEqual([
          {
            select: {
              protobuf: { fields: { device_id: { id: 1, type: "string" } } },
            },
          },
        ]);
      });

      it("drops an incomplete field row and falls back to message_name/schema", () => {
        const initial = blankSelectTransform();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = updateProtobuf(transform, firstStepId(transform), {
          messageName: "pkg.SensorReading",
        });
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { protobuf: { message_name: "pkg.SensorReading" } } },
        ]);
      });

      it("treats a negative, zero, or non-integer field id as incomplete", () => {
        for (const badId of ["-1", "0", "1.5"]) {
          const initial = blankSelectTransform();
          let transform = addFormatSection(
            initial,
            firstStepId(initial),
            "protobuf",
          );
          transform = updateProtobuf(transform, firstStepId(transform), {
            messageName: "pkg.SensorReading",
          });
          transform = addProtobufFieldRow(transform, firstStepId(transform));
          transform = updateProtobufFieldRow(
            transform,
            firstStepId(transform),
            transform.select.sqlSteps[0].protobuf.fields[0].id,
            { column: "device_id", fieldId: badId, fieldType: "string" },
          );
          expect(buildExtPayload([transform])).toEqual([
            { select: { protobuf: { message_name: "pkg.SensorReading" } } },
          ]);
        }
      });

      it("includes export fields only when the export section is added", () => {
        const initial = blankSelectTransform();
        let transform = updateSelectExport(initial, firstStepId(initial), {
          format: "parquet",
          rows: "100",
        });
        expect(buildExtPayload([transform])).toEqual([{ select: {} }]);

        transform = addFormatSection(
          transform,
          firstStepId(transform),
          "export",
        );
        expect(buildExtPayload([transform])).toEqual([
          { select: { export: { format: "parquet", rows: 100 } } },
        ]);
      });

      it("omits a non-numeric rows value", () => {
        const initial = blankSelectTransform();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "export",
        );
        transform = updateSelectExport(transform, firstStepId(transform), {
          rows: "not-a-number",
        });
        expect(buildExtPayload([transform])).toEqual([
          { select: { export: {} } },
        ]);
      });
    });

    describe("parseExtPayload (input formats and export)", () => {
      it("parses csv with has_headers", () => {
        const result = parseExtPayload({
          select: { csv: { has_headers: true } },
        });
        expect(result.success).toBe(true);
        const [step] = expectSelect(result.transforms).select.sqlSteps;
        expect(step.formatSections).toEqual(["csv"]);
        expect(step.csv).toEqual({ hasHeaders: true });
      });

      it("rejects a non-boolean has_headers", () => {
        expect(
          parseExtPayload({ select: { csv: { has_headers: "yes" } } }).success,
        ).toBe(false);
      });

      it("parses protobuf fields into rows", () => {
        const result = parseExtPayload({
          select: {
            protobuf: {
              fields: { device_id: { id: 1, type: "string" } },
            },
          },
        });
        expect(result.success).toBe(true);
        expect(
          expectSelect(result.transforms).select.sqlSteps[0].protobuf.fields,
        ).toContainEqual(
          expect.objectContaining({
            column: "device_id",
            fieldId: "1",
            fieldType: "string",
          }),
        );
      });

      it("rejects a non-number protobuf field id", () => {
        expect(
          parseExtPayload({
            select: {
              protobuf: { fields: { device_id: { id: "1", type: "string" } } },
            },
          }).success,
        ).toBe(false);
      });

      it("rejects a zero, negative, or non-integer protobuf field id", () => {
        for (const badId of [0, -1, 1.5]) {
          expect(
            parseExtPayload({
              select: {
                protobuf: {
                  fields: { device_id: { id: badId, type: "string" } },
                },
              },
            }).success,
          ).toBe(false);
        }
      });

      it("rejects conflicting input format sections", () => {
        expect(parseExtPayload({ select: { csv: {}, json: {} } }).success).toBe(
          false,
        );
        expect(
          parseExtPayload({ select: { csv: {}, protobuf: {} } }).success,
        ).toBe(false);
      });

      it("parses export with a numeric rows and duration", () => {
        const result = parseExtPayload({
          select: { export: { format: "parquet", rows: 100, duration: "1m" } },
        });
        expect(result.success).toBe(true);
        expect(
          expectSelect(result.transforms).select.sqlSteps[0].export,
        ).toEqual({
          format: "parquet",
          rows: "100",
          duration: "1m",
        });
      });

      it("rejects a non-number export rows", () => {
        expect(
          parseExtPayload({ select: { export: { rows: "100" } } }).success,
        ).toBe(false);
      });

      it("round-trips csv + protobuf fields + export through buildExtPayload", () => {
        const initial = createSelectTransformStep();
        let transform = addFormatSection(
          initial,
          firstStepId(initial),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform, firstStepId(transform));
        transform = updateProtobufFieldRow(
          transform,
          firstStepId(transform),
          transform.select.sqlSteps[0].protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        transform = addFormatSection(
          transform,
          firstStepId(transform),
          "export",
        );
        transform = updateSelectExport(transform, firstStepId(transform), {
          format: "json",
          rows: "50",
        });

        const payload = buildExtPayload([transform]);
        const parsed = parseExtPayload(payload);
        expect(parsed.success).toBe(true);
        expect(buildExtPayload(parsed.transforms ?? [])).toEqual(payload);
      });
    });
  });

  describe("ros and select can coexist", () => {
    it("parses ext with both ros and select present into two transforms", () => {
      const result = parseExtPayload({
        ros: { extract: { topic: "/robot/odom" } },
        select: { sql: "SELECT * FROM ENTRY()" },
      });
      expect(result.success).toBe(true);
      expect(result.transforms).toHaveLength(2);
      expect(expectRos(result.transforms).ros.topic).toBe("/robot/odom");
      expect(expectSelect(result.transforms).select.sqlSteps[0].sql).toBe(
        "SELECT * FROM ENTRY()",
      );
    });

    it("combines both into a single #ext pipeline array when building the payload", () => {
      expect(
        buildExtPayload([createRosTransformStep(), blankSelectTransform()]),
      ).toEqual([{ ros: { extract: {} } }, { select: {} }]);
    });

    it("always puts ros before select in the payload, regardless of block order", () => {
      // The server runs "#ext" pipeline stages in array order, and ros must
      // run before select (select otherwise receives the raw, not-yet-
      // extracted record) - this must hold even when the user has visually
      // arranged the Select block above the ROS block.
      const payload = buildExtPayload([
        blankSelectTransform(),
        createRosTransformStep(),
      ]);
      expect(payload?.map((stage) => Object.keys(stage)[0])).toEqual([
        "ros",
        "select",
      ]);
    });
  });

  describe("ROS-only mutators guard against a select-kind transform", () => {
    it("no-ops when called on a select transform", () => {
      const select = createSelectTransformStep();
      expect(addSection(select, "filter")).toBe(select);
      expect(removeSection(select, "filter")).toBe(select);
      expect(updateTopic(select, "/robot/odom")).toBe(select);
      expect(updateExport(select, { format: "mcap" })).toBe(select);
      expect(addEncodeRow(select)).toBe(select);
      expect(updateEncodeRow(select, "x", { key: "a" })).toBe(select);
      expect(removeEncodeRow(select, "x")).toBe(select);
    });
  });
});
