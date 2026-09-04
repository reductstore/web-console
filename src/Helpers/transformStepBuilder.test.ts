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
  updateSql,
  updateTopic,
} from "./transformStepBuilder";

function expectRos(
  transform: TransformStepEntry | undefined,
): Extract<TransformStepEntry, { kind: "ros" }> {
  if (transform?.kind !== "ros") throw new Error("expected a ros transform");
  return transform;
}

function expectSelect(
  transform: TransformStepEntry | undefined,
): Extract<TransformStepEntry, { kind: "select" }> {
  if (transform?.kind !== "select") {
    throw new Error("expected a select transform");
  }
  return transform;
}

function blankSelectTransform() {
  return updateSql(createSelectTransformStep(), "");
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

    it("keeps an empty ros.export when the section is present but every field is blank", () => {
      let transform = addSection(createRosTransformStep(), "export");
      transform = updateExport(transform, { format: "" });
      expect(buildExtPayload(transform)).toEqual({ ros: { export: {} } });
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

    it("rejects an array in place of ros, extract, or export", () => {
      expect(parseExtPayload({ ros: [] }).success).toBe(false);
      expect(parseExtPayload({ ros: { extract: [] } }).success).toBe(false);
      expect(parseExtPayload({ ros: { export: [] } }).success).toBe(false);
    });

    it("succeeds with an empty extract and no sections", () => {
      const result = parseExtPayload({ ros: { extract: {} } });
      expect(result.success).toBe(true);
      expect(expectRos(result.transform).ros.sections).toEqual([]);
    });

    it("parses an empty export object into the export section", () => {
      const result = parseExtPayload({ ros: { export: {} } });
      expect(result.success).toBe(true);
      expect(expectRos(result.transform).ros.sections).toEqual(["export"]);
    });

    it("parses topic into the filter section", () => {
      const result = parseExtPayload({
        ros: { extract: { topic: "/robot/odom" } },
      });
      expect(result.success).toBe(true);
      expect(expectRos(result.transform).ros.sections).toEqual(["filter"]);
      expect(expectRos(result.transform).ros.topic).toBe("/robot/odom");
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
      expect(expectRos(result.transform).ros.sections).toEqual(["encode"]);
      expect(expectRos(result.transform).ros.encode).toContainEqual(
        expect.objectContaining({ key: "data", value: "jpeg" }),
      );
    });

    it("parses as_label into rows", () => {
      const result = parseExtPayload({
        ros: { extract: { as_label: { speed: "data.speed" } } },
      });
      expect(result.success).toBe(true);
      expect(expectRos(result.transform).ros.sections).toEqual(["label"]);
      expect(expectRos(result.transform).ros.asLabel).toContainEqual(
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
      expect(expectRos(result.transform).ros.sections).toEqual(["export"]);
      expect(expectRos(result.transform).ros.export).toEqual({
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

  describe("select transform", () => {
    describe("createSelectTransformStep", () => {
      it("defaults to SELECT * FROM ENTRY() and no as_label rows", () => {
        const transform = createSelectTransformStep();
        expect(transform.kind).toBe("select");
        expect(transform.select.sql).toBe("SELECT * FROM ENTRY()");
        expect(transform.select.asLabel).toEqual([]);
      });
    });

    describe("updateSql", () => {
      it("updates the sql expression", () => {
        const transform = updateSql(
          createSelectTransformStep(),
          "SELECT * FROM ENTRY()",
        );
        expect(transform.select.sql).toBe("SELECT * FROM ENTRY()");
      });
    });

    describe("as_label rows", () => {
      it("adds, updates, and removes rows", () => {
        const transform = addAsLabelRow(createSelectTransformStep());
        expect(transform.select.asLabel).toHaveLength(1);
        const [first] = transform.select.asLabel;

        const updated = updateAsLabelRow(transform, first.id, {
          key: "speed",
          value: "vector.x",
        });
        expect(updated.select.asLabel[0]).toMatchObject({
          key: "speed",
          value: "vector.x",
        });

        const removed = removeAsLabelRow(updated, first.id);
        expect(removed.select.asLabel).toHaveLength(0);
      });
    });

    describe("hasIncompleteTransform", () => {
      it("is false with a blank sql and no as_label rows", () => {
        expect(hasIncompleteTransform(createSelectTransformStep())).toBe(false);
      });

      it("is true for a partially filled as_label row", () => {
        let transform = addAsLabelRow(createSelectTransformStep());
        transform = updateAsLabelRow(
          transform,
          transform.select.asLabel[0].id,
          {
            key: "speed",
          },
        );
        expect(hasIncompleteTransform(transform)).toBe(true);
      });

      it("is false once the as_label row is complete", () => {
        let transform = addAsLabelRow(createSelectTransformStep());
        transform = updateAsLabelRow(
          transform,
          transform.select.asLabel[0].id,
          {
            key: "speed",
            value: "vector.x",
          },
        );
        expect(hasIncompleteTransform(transform)).toBe(false);
      });
    });

    describe("buildExtPayload", () => {
      it("includes the default sql when nothing else is filled in", () => {
        expect(buildExtPayload(createSelectTransformStep())).toEqual({
          select: { sql: "SELECT * FROM ENTRY()" },
        });
      });

      it("returns an empty select object when sql is also blank", () => {
        expect(buildExtPayload(blankSelectTransform())).toEqual({
          select: {},
        });
      });

      it("includes sql only when non-blank", () => {
        const transform = updateSql(
          createSelectTransformStep(),
          "  SELECT * FROM ENTRY()  ",
        );
        expect(buildExtPayload(transform)).toEqual({
          select: { sql: "SELECT * FROM ENTRY()" },
        });
      });

      it("builds the as_label map, dropping incomplete rows", () => {
        let transform = addAsLabelRow(blankSelectTransform());
        transform = updateAsLabelRow(
          transform,
          transform.select.asLabel[0].id,
          {
            key: "speed",
            value: "vector.x",
          },
        );
        expect(buildExtPayload(transform)).toEqual({
          select: { as_label: { speed: "vector.x" } },
        });
      });

      it("includes both sql and as_label when both are filled", () => {
        let transform = updateSql(
          createSelectTransformStep(),
          "SELECT * FROM ENTRY()",
        );
        transform = addAsLabelRow(transform);
        transform = updateAsLabelRow(
          transform,
          transform.select.asLabel[0].id,
          {
            key: "speed",
            value: "vector.x",
          },
        );
        expect(buildExtPayload(transform)).toEqual({
          select: {
            sql: "SELECT * FROM ENTRY()",
            as_label: { speed: "vector.x" },
          },
        });
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
        expect(expectSelect(result.transform).select).toEqual({
          sql: "",
          asLabel: [],
          formatSections: [],
          csv: { hasHeaders: false },
          protobuf: { messageName: "", schema: "", fields: [] },
          export: { format: "", rows: "", duration: "" },
        });
      });

      it("parses sql and as_label", () => {
        const result = parseExtPayload({
          select: {
            sql: "SELECT * FROM ENTRY()",
            as_label: { speed: "vector.x" },
          },
        });
        expect(result.success).toBe(true);
        expect(expectSelect(result.transform).select.sql).toBe(
          "SELECT * FROM ENTRY()",
        );
        expect(expectSelect(result.transform).select.asLabel).toContainEqual(
          expect.objectContaining({ key: "speed", value: "vector.x" }),
        );
      });

      it("round-trips through buildExtPayload", () => {
        const transform: TransformStepEntry = {
          kind: "select",
          select: {
            sql: "SELECT * FROM ENTRY()",
            asLabel: [{ id: "l1", key: "speed", value: "vector.x" }],
            formatSections: [],
            csv: { hasHeaders: false },
            protobuf: { messageName: "", schema: "", fields: [] },
            export: { format: "", rows: "", duration: "" },
          },
        };
        const payload = buildExtPayload(transform);
        const parsed = parseExtPayload(payload);
        expect(parsed.success).toBe(true);
        expect(buildExtPayload(parsed.transform)).toEqual(payload);
      });
    });

    describe("format sections", () => {
      it("adds and removes a format section", () => {
        const transform = addFormatSection(createSelectTransformStep(), "csv");
        expect(transform.select.formatSections).toEqual(["csv"]);
        const removed = removeFormatSection(transform, "csv");
        expect(removed.select.formatSections).toEqual([]);
      });

      it("is a no-op if the section is already present", () => {
        const transform = addFormatSection(createSelectTransformStep(), "json");
        const again = addFormatSection(transform, "json");
        expect(again).toBe(transform);
      });
    });

    describe("changeFormat", () => {
      it("replaces the active csv/json/parquet format in a single call", () => {
        const withCsv = addFormatSection(createSelectTransformStep(), "csv");
        const withJson = changeFormat(withCsv, "json");
        expect(withJson.select.formatSections).toEqual(["json"]);
      });

      it("leaves protobuf and export untouched", () => {
        const withProtobuf = addFormatSection(
          createSelectTransformStep(),
          "protobuf",
        );
        const withExport = addFormatSection(withProtobuf, "export");
        const changed = changeFormat(withExport, "parquet");
        expect(changed.select.formatSections).toEqual([
          "protobuf",
          "export",
          "parquet",
        ]);
      });

      it("is a single mutation even when no format was active yet", () => {
        const changed = changeFormat(createSelectTransformStep(), "csv");
        expect(changed.select.formatSections).toEqual(["csv"]);
      });
    });

    describe("updateCsv", () => {
      it("updates hasHeaders", () => {
        const transform = updateCsv(createSelectTransformStep(), {
          hasHeaders: true,
        });
        expect(transform.select.csv.hasHeaders).toBe(true);
      });
    });

    describe("protobuf config", () => {
      it("updates messageName and schema", () => {
        const transform = updateProtobuf(createSelectTransformStep(), {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        expect(transform.select.protobuf.messageName).toBe("pkg.SensorReading");
        expect(transform.select.protobuf.schema).toBe("base64==");
      });

      it("adds, updates, and removes field rows", () => {
        const transform = addProtobufFieldRow(createSelectTransformStep());
        expect(transform.select.protobuf.fields).toHaveLength(1);
        const [first] = transform.select.protobuf.fields;

        const updated = updateProtobufFieldRow(transform, first.id, {
          column: "device_id",
          fieldId: "1",
          fieldType: "string",
        });
        expect(updated.select.protobuf.fields[0]).toMatchObject({
          column: "device_id",
          fieldId: "1",
          fieldType: "string",
        });

        const removed = removeProtobufFieldRow(updated, first.id);
        expect(removed.select.protobuf.fields).toHaveLength(0);
      });
    });

    describe("updateSelectExport", () => {
      it("merges partial changes into the export config", () => {
        const transform = updateSelectExport(createSelectTransformStep(), {
          format: "parquet",
        });
        expect(transform.select.export).toEqual({
          format: "parquet",
          rows: "",
          duration: "",
        });
      });
    });

    describe("hasIncompleteTransform (protobuf fields)", () => {
      it("is false when protobuf isn't an active format section", () => {
        let transform = addProtobufFieldRow(createSelectTransformStep());
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(hasIncompleteTransform(transform)).toBe(false);
      });

      it("is true for a partially filled field row once protobuf is active", () => {
        let transform = addFormatSection(
          createSelectTransformStep(),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform);
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(hasIncompleteTransform(transform)).toBe(true);
      });

      it("is false once the field row is fully filled", () => {
        let transform = addFormatSection(
          createSelectTransformStep(),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform);
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        expect(hasIncompleteTransform(transform)).toBe(false);
      });
    });

    describe("buildExtPayload (input formats and export)", () => {
      it("includes csv with has_headers", () => {
        let transform = addFormatSection(blankSelectTransform(), "csv");
        transform = updateCsv(transform, { hasHeaders: true });
        expect(buildExtPayload(transform)).toEqual({
          select: { csv: { has_headers: true } },
        });
      });

      it("includes an empty json object", () => {
        const transform = addFormatSection(blankSelectTransform(), "json");
        expect(buildExtPayload(transform)).toEqual({ select: { json: {} } });
      });

      it("includes an empty parquet object", () => {
        const transform = addFormatSection(blankSelectTransform(), "parquet");
        expect(buildExtPayload(transform)).toEqual({
          select: { parquet: {} },
        });
      });

      it("builds protobuf from message_name/schema when no field rows are complete", () => {
        let transform = addFormatSection(blankSelectTransform(), "protobuf");
        transform = updateProtobuf(transform, {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        expect(buildExtPayload(transform)).toEqual({
          select: {
            protobuf: {
              message_name: "pkg.SensorReading",
              schema: "base64==",
            },
          },
        });
      });

      it("prefers complete field rows over message_name/schema", () => {
        let transform = addFormatSection(blankSelectTransform(), "protobuf");
        transform = updateProtobuf(transform, {
          messageName: "pkg.SensorReading",
          schema: "base64==",
        });
        transform = addProtobufFieldRow(transform);
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        expect(buildExtPayload(transform)).toEqual({
          select: {
            protobuf: { fields: { device_id: { id: 1, type: "string" } } },
          },
        });
      });

      it("drops an incomplete field row and falls back to message_name/schema", () => {
        let transform = addFormatSection(blankSelectTransform(), "protobuf");
        transform = updateProtobuf(transform, {
          messageName: "pkg.SensorReading",
        });
        transform = addProtobufFieldRow(transform);
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id" },
        );
        expect(buildExtPayload(transform)).toEqual({
          select: { protobuf: { message_name: "pkg.SensorReading" } },
        });
      });

      it("treats a negative, zero, or non-integer field id as incomplete", () => {
        for (const badId of ["-1", "0", "1.5"]) {
          let transform = addFormatSection(blankSelectTransform(), "protobuf");
          transform = updateProtobuf(transform, {
            messageName: "pkg.SensorReading",
          });
          transform = addProtobufFieldRow(transform);
          transform = updateProtobufFieldRow(
            transform,
            transform.select.protobuf.fields[0].id,
            { column: "device_id", fieldId: badId, fieldType: "string" },
          );
          expect(buildExtPayload(transform)).toEqual({
            select: { protobuf: { message_name: "pkg.SensorReading" } },
          });
        }
      });

      it("includes export fields only when the export section is added", () => {
        let transform = updateSelectExport(blankSelectTransform(), {
          format: "parquet",
          rows: "100",
        });
        expect(buildExtPayload(transform)).toEqual({ select: {} });

        transform = addFormatSection(transform, "export");
        expect(buildExtPayload(transform)).toEqual({
          select: { export: { format: "parquet", rows: 100 } },
        });
      });

      it("omits a non-numeric rows value", () => {
        let transform = addFormatSection(blankSelectTransform(), "export");
        transform = updateSelectExport(transform, { rows: "not-a-number" });
        expect(buildExtPayload(transform)).toEqual({ select: { export: {} } });
      });
    });

    describe("parseExtPayload (input formats and export)", () => {
      it("parses csv with has_headers", () => {
        const result = parseExtPayload({
          select: { csv: { has_headers: true } },
        });
        expect(result.success).toBe(true);
        expect(expectSelect(result.transform).select.formatSections).toEqual([
          "csv",
        ]);
        expect(expectSelect(result.transform).select.csv).toEqual({
          hasHeaders: true,
        });
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
          expectSelect(result.transform).select.protobuf.fields,
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
        expect(expectSelect(result.transform).select.export).toEqual({
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
        let transform = addFormatSection(
          createSelectTransformStep(),
          "protobuf",
        );
        transform = addProtobufFieldRow(transform);
        transform = updateProtobufFieldRow(
          transform,
          transform.select.protobuf.fields[0].id,
          { column: "device_id", fieldId: "1", fieldType: "string" },
        );
        transform = addFormatSection(transform, "export");
        transform = updateSelectExport(transform, {
          format: "json",
          rows: "50",
        });

        const payload = buildExtPayload(transform);
        const parsed = parseExtPayload(payload);
        expect(parsed.success).toBe(true);
        expect(buildExtPayload(parsed.transform)).toEqual(payload);
      });
    });
  });

  describe("ros and select are mutually exclusive", () => {
    it("rejects ext with both ros and select present", () => {
      expect(
        parseExtPayload({ ros: { extract: {} }, select: {} }).success,
      ).toBe(false);
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
