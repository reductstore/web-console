export type TransformKind = "ros" | "select";

export type RosSection = "filter" | "encode" | "label" | "export";

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
}

export interface RosExportConfig {
  format: string;
  duration: string;
  size: string;
}

export interface RosTransformStep {
  sections: RosSection[];
  topic: string;
  encode: KeyValueRow[];
  asLabel: KeyValueRow[];
  export: RosExportConfig;
}

export type SelectInputFormat = "csv" | "json" | "parquet";

export type SelectFormatSection = SelectInputFormat | "protobuf" | "export";

export interface CsvConfig {
  hasHeaders: boolean;
}

export interface ProtobufFieldRow {
  id: string;
  column: string;
  fieldId: string;
  fieldType: string;
}

export interface ProtobufConfig {
  messageName: string;
  schema: string;
  fields: ProtobufFieldRow[];
}

export interface SelectExportConfig {
  format: string;
  rows: string;
  duration: string;
}

export interface SelectTransformStep {
  sql: string;
  asLabel: KeyValueRow[];
  formatSections: SelectFormatSection[];
  csv: CsvConfig;
  protobuf: ProtobufConfig;
  export: SelectExportConfig;
}

export type TransformStepEntry =
  | { kind: "ros"; ros: RosTransformStep }
  | { kind: "select"; select: SelectTransformStep };

export const TRANSFORM_BLOCK_ID = "transform";

function blankRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: "", value: "" };
}

export function createRosTransformStep(): Extract<
  TransformStepEntry,
  { kind: "ros" }
> {
  return {
    kind: "ros",
    ros: {
      sections: [],
      topic: "",
      encode: [],
      asLabel: [],
      export: { format: "", duration: "", size: "" },
    },
  };
}

export function createSelectTransformStep(): Extract<
  TransformStepEntry,
  { kind: "select" }
> {
  return {
    kind: "select",
    select: {
      sql: "",
      asLabel: [],
      formatSections: [],
      csv: { hasHeaders: false },
      protobuf: { messageName: "", schema: "", fields: [] },
      export: { format: "", rows: "", duration: "" },
    },
  };
}

export function updateSql<Entry extends TransformStepEntry>(
  transform: Entry,
  sql: string,
): Entry {
  if (transform.kind !== "select") return transform;
  return { ...transform, select: { ...transform.select, sql } } as Entry;
}

export function addFormatSection<Entry extends TransformStepEntry>(
  transform: Entry,
  section: SelectFormatSection,
): Entry {
  if (transform.kind !== "select") return transform;
  if (transform.select.formatSections.includes(section)) {
    return transform;
  }
  const select = {
    ...transform.select,
    formatSections: [...transform.select.formatSections, section],
  };
  if (section === "protobuf" && select.protobuf.fields.length === 0) {
    select.protobuf = {
      ...select.protobuf,
      fields: [blankProtobufFieldRow()],
    };
  }
  return { ...transform, select } as Entry;
}

export function changeFormat<Entry extends TransformStepEntry>(
  transform: Entry,
  format: SelectInputFormat,
): Entry {
  if (transform.kind !== "select") return transform;
  const formatSections = transform.select.formatSections.filter(
    (s) => s !== "csv" && s !== "json" && s !== "parquet",
  );
  return {
    ...transform,
    select: {
      ...transform.select,
      formatSections: [...formatSections, format],
    },
  } as Entry;
}

export function removeFormatSection<Entry extends TransformStepEntry>(
  transform: Entry,
  section: SelectFormatSection,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      formatSections: transform.select.formatSections.filter(
        (s) => s !== section,
      ),
    },
  } as Entry;
}

export function updateCsv<Entry extends TransformStepEntry>(
  transform: Entry,
  changes: Partial<CsvConfig>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      csv: { ...transform.select.csv, ...changes },
    },
  } as Entry;
}

export function updateProtobuf<Entry extends TransformStepEntry>(
  transform: Entry,
  changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      protobuf: { ...transform.select.protobuf, ...changes },
    },
  } as Entry;
}

function blankProtobufFieldRow(): ProtobufFieldRow {
  return { id: crypto.randomUUID(), column: "", fieldId: "", fieldType: "" };
}

export function addProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      protobuf: {
        ...transform.select.protobuf,
        fields: [...transform.select.protobuf.fields, blankProtobufFieldRow()],
      },
    },
  } as Entry;
}

export function updateProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
  changes: Partial<Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      protobuf: {
        ...transform.select.protobuf,
        fields: transform.select.protobuf.fields.map((row) =>
          row.id === id ? { ...row, ...changes } : row,
        ),
      },
    },
  } as Entry;
}

export function removeProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      protobuf: {
        ...transform.select.protobuf,
        fields: transform.select.protobuf.fields.filter((row) => row.id !== id),
      },
    },
  } as Entry;
}

export function updateSelectExport<Entry extends TransformStepEntry>(
  transform: Entry,
  changes: Partial<SelectExportConfig>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      ...transform.select,
      export: { ...transform.select.export, ...changes },
    },
  } as Entry;
}

export function addSection<Entry extends TransformStepEntry>(
  transform: Entry,
  section: RosSection,
): Entry {
  if (transform.kind !== "ros") return transform;
  if (transform.ros.sections.includes(section)) {
    return transform;
  }
  const ros = {
    ...transform.ros,
    sections: [...transform.ros.sections, section],
  };
  if (section === "encode" && ros.encode.length === 0) {
    ros.encode = [blankRow()];
  }
  if (section === "label" && ros.asLabel.length === 0) {
    ros.asLabel = [blankRow()];
  }
  if (section === "export" && !ros.export.format) {
    // "mcap" is currently the only supported export format.
    ros.export = { ...ros.export, format: "mcap" };
  }
  return { ...transform, ros } as Entry;
}

export function removeSection<Entry extends TransformStepEntry>(
  transform: Entry,
  section: RosSection,
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: {
      ...transform.ros,
      sections: transform.ros.sections.filter((s) => s !== section),
    },
  } as Entry;
}

export function updateTopic<Entry extends TransformStepEntry>(
  transform: Entry,
  topic: string,
): Entry {
  if (transform.kind !== "ros") return transform;
  return { ...transform, ros: { ...transform.ros, topic } } as Entry;
}

export function updateExport<Entry extends TransformStepEntry>(
  transform: Entry,
  changes: Partial<RosExportConfig>,
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: { ...transform.ros, export: { ...transform.ros.export, ...changes } },
  } as Entry;
}

function addRow(rows: KeyValueRow[]): KeyValueRow[] {
  return [...rows, blankRow()];
}

function updateRow(
  rows: KeyValueRow[],
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): KeyValueRow[] {
  return rows.map((row) => (row.id === id ? { ...row, ...changes } : row));
}

function removeRow(rows: KeyValueRow[], id: string): KeyValueRow[] {
  return rows.filter((row) => row.id !== id);
}

export function addEncodeRow<Entry extends TransformStepEntry>(
  transform: Entry,
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: { ...transform.ros, encode: addRow(transform.ros.encode) },
  } as Entry;
}

export function updateEncodeRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: {
      ...transform.ros,
      encode: updateRow(transform.ros.encode, id, changes),
    },
  } as Entry;
}

export function removeEncodeRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: { ...transform.ros, encode: removeRow(transform.ros.encode, id) },
  } as Entry;
}

export function addAsLabelRow<Entry extends TransformStepEntry>(
  transform: Entry,
): Entry {
  return (
    transform.kind === "ros"
      ? {
          ...transform,
          ros: { ...transform.ros, asLabel: addRow(transform.ros.asLabel) },
        }
      : {
          ...transform,
          select: {
            ...transform.select,
            asLabel: addRow(transform.select.asLabel),
          },
        }
  ) as Entry;
}

export function updateAsLabelRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): Entry {
  return (
    transform.kind === "ros"
      ? {
          ...transform,
          ros: {
            ...transform.ros,
            asLabel: updateRow(transform.ros.asLabel, id, changes),
          },
        }
      : {
          ...transform,
          select: {
            ...transform.select,
            asLabel: updateRow(transform.select.asLabel, id, changes),
          },
        }
  ) as Entry;
}

export function removeAsLabelRow<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
): Entry {
  return (
    transform.kind === "ros"
      ? {
          ...transform,
          ros: {
            ...transform.ros,
            asLabel: removeRow(transform.ros.asLabel, id),
          },
        }
      : {
          ...transform,
          select: {
            ...transform.select,
            asLabel: removeRow(transform.select.asLabel, id),
          },
        }
  ) as Entry;
}

function isCompleteRow(row: KeyValueRow): boolean {
  return row.key.trim() !== "" && row.value.trim() !== "";
}

function hasPartialRow(rows: KeyValueRow[]): boolean {
  return rows.some(
    (row) => (row.key.trim() !== "") !== (row.value.trim() !== ""),
  );
}

function hasPartialProtobufFieldRow(rows: ProtobufFieldRow[]): boolean {
  return rows.some((row) => {
    const filledCount = [row.column, row.fieldId, row.fieldType].filter(
      (value) => value.trim() !== "",
    ).length;
    return filledCount > 0 && filledCount < 3;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRowMap(raw: unknown): KeyValueRow[] | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const rows = Object.entries(raw).map(([key, value]) => ({
    id: crypto.randomUUID(),
    key,
    value: typeof value === "string" ? value : String(value),
  }));
  return rows.length === 0 ? [blankRow()] : rows;
}

export function hasIncompleteTransform(
  transform: TransformStepEntry | undefined,
): boolean {
  if (!transform) {
    return false;
  }
  if (transform.kind === "select") {
    if (hasPartialRow(transform.select.asLabel)) {
      return true;
    }
    return (
      transform.select.formatSections.includes("protobuf") &&
      hasPartialProtobufFieldRow(transform.select.protobuf.fields)
    );
  }
  const { sections, encode, asLabel } = transform.ros;
  if (sections.includes("encode") && hasPartialRow(encode)) {
    return true;
  }
  if (sections.includes("label") && hasPartialRow(asLabel)) {
    return true;
  }
  return false;
}

function rowsToMap(rows: KeyValueRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter(isCompleteRow).map((row) => [row.key.trim(), row.value.trim()]),
  );
}

export function buildExtPayload(
  transform: TransformStepEntry | undefined,
): Record<string, unknown> | undefined {
  if (!transform) {
    return undefined;
  }
  if (transform.kind === "select") {
    const {
      sql,
      asLabel,
      formatSections,
      csv,
      protobuf,
      export: exportConfig,
    } = transform.select;
    const select: Record<string, unknown> = {};

    if (formatSections.includes("csv")) {
      select.csv = { has_headers: csv.hasHeaders };
    }
    if (formatSections.includes("json")) {
      select.json = {};
    }
    if (formatSections.includes("parquet")) {
      select.parquet = {};
    }
    if (formatSections.includes("protobuf")) {
      const completeFields = protobuf.fields.filter(
        (row) =>
          row.column.trim() &&
          row.fieldType.trim() &&
          !Number.isNaN(Number(row.fieldId)),
      );
      if (completeFields.length > 0) {
        select.protobuf = {
          fields: Object.fromEntries(
            completeFields.map((row) => [
              row.column.trim(),
              { id: Number(row.fieldId), type: row.fieldType },
            ]),
          ),
        };
      } else {
        const protobufConfig: Record<string, unknown> = {};
        if (protobuf.messageName.trim())
          protobufConfig.message_name = protobuf.messageName.trim();
        if (protobuf.schema.trim())
          protobufConfig.schema = protobuf.schema.trim();
        select.protobuf = protobufConfig;
      }
    }

    if (sql.trim()) select.sql = sql.trim();

    if (formatSections.includes("export")) {
      const exportPayload: Record<string, unknown> = {};
      if (exportConfig.format.trim())
        exportPayload.format = exportConfig.format.trim();
      if (exportConfig.rows.trim()) {
        const rows = Number(exportConfig.rows);
        if (!Number.isNaN(rows)) exportPayload.rows = rows;
      }
      if (exportConfig.duration.trim())
        exportPayload.duration = exportConfig.duration.trim();
      select.export = exportPayload;
    }

    const asLabelMap = rowsToMap(asLabel);
    if (Object.keys(asLabelMap).length > 0) select.as_label = asLabelMap;

    return { select };
  }
  const {
    sections,
    topic,
    encode,
    asLabel,
    export: exportConfig,
  } = transform.ros;

  const extract: Record<string, unknown> = {};
  if (sections.includes("filter") && topic.trim()) {
    extract.topic = topic.trim();
  }
  if (sections.includes("encode")) {
    const encodeMap = rowsToMap(encode);
    if (Object.keys(encodeMap).length > 0) {
      extract.encode = encodeMap;
    }
  }
  if (sections.includes("label")) {
    const asLabelMap = rowsToMap(asLabel);
    if (Object.keys(asLabelMap).length > 0) {
      extract.as_label = asLabelMap;
    }
  }

  const ros: Record<string, unknown> = {};
  // The server only accepts one of extract/export/transform per request, so
  // extract is only ever included when a filter/encode/label section is
  // actually contributing something to it.
  if (Object.keys(extract).length > 0) {
    ros.extract = extract;
  }
  if (sections.includes("export")) {
    const exportPayload: Record<string, unknown> = {};
    if (exportConfig.format.trim())
      exportPayload.format = exportConfig.format.trim();
    if (exportConfig.duration.trim())
      exportPayload.duration = exportConfig.duration.trim();
    if (exportConfig.size.trim()) exportPayload.size = exportConfig.size.trim();
    // Kept even when empty - the section being present is what signals
    // export mode, not whether its fields happen to be filled in yet.
    ros.export = exportPayload;
  }

  if (Object.keys(ros).length === 0) {
    return { ros: { extract: {} } };
  }
  return { ros };
}

export function parseExtPayload(ext: unknown): {
  success: boolean;
  transform?: TransformStepEntry;
} {
  if (ext === undefined) {
    return { success: true };
  }
  if (!isPlainObject(ext)) {
    return { success: false };
  }
  const { ros, select } = ext;
  if (ros !== undefined && select !== undefined) {
    return { success: false };
  }
  return select !== undefined
    ? parseSelectPayload(select)
    : parseRosPayload(ros);
}

function parseRosPayload(ros: unknown): {
  success: boolean;
  transform?: TransformStepEntry;
} {
  if (!isPlainObject(ros)) {
    return { success: false };
  }
  const { extract, export: exportRaw } = ros;

  const sections: RosSection[] = [];
  let topic = "";
  let encode: KeyValueRow[] = [];
  let asLabel: KeyValueRow[] = [];

  if (extract !== undefined) {
    if (!isPlainObject(extract)) {
      return { success: false };
    }
    const {
      topic: topicRaw,
      encode: encodeRaw,
      as_label: asLabelRaw,
    } = extract;

    if (topicRaw !== undefined) {
      if (typeof topicRaw !== "string") {
        return { success: false };
      }
      sections.push("filter");
      topic = topicRaw;
    }

    if (encodeRaw !== undefined) {
      const rows = parseRowMap(encodeRaw);
      if (!rows) {
        return { success: false };
      }
      sections.push("encode");
      encode = rows;
    }

    if (asLabelRaw !== undefined) {
      const rows = parseRowMap(asLabelRaw);
      if (!rows) {
        return { success: false };
      }
      sections.push("label");
      asLabel = rows;
    }
  }

  let exportConfig: RosExportConfig = { format: "", duration: "", size: "" };
  if (exportRaw !== undefined) {
    if (!isPlainObject(exportRaw)) {
      return { success: false };
    }
    const { format, duration, size } = exportRaw;
    if (format !== undefined && typeof format !== "string") {
      return { success: false };
    }
    if (duration !== undefined && typeof duration !== "string") {
      return { success: false };
    }
    if (size !== undefined && typeof size !== "string") {
      return { success: false };
    }
    sections.push("export");
    exportConfig = {
      format: (format as string) ?? "",
      duration: (duration as string) ?? "",
      size: (size as string) ?? "",
    };
  }

  return {
    success: true,
    transform: {
      kind: "ros",
      ros: { sections, topic, encode, asLabel, export: exportConfig },
    },
  };
}

function parseSelectPayload(select: unknown): {
  success: boolean;
  transform?: TransformStepEntry;
} {
  if (!isPlainObject(select)) {
    return { success: false };
  }
  const {
    sql,
    as_label: asLabelRaw,
    csv: csvRaw,
    json: jsonRaw,
    parquet: parquetRaw,
    protobuf: protobufRaw,
    export: exportRaw,
  } = select;

  if (sql !== undefined && typeof sql !== "string") {
    return { success: false };
  }

  const formatSections: SelectFormatSection[] = [];
  let csv: CsvConfig = { hasHeaders: false };
  let protobuf: ProtobufConfig = { messageName: "", schema: "", fields: [] };
  let exportConfig: SelectExportConfig = { format: "", rows: "", duration: "" };

  if (csvRaw !== undefined) {
    if (!isPlainObject(csvRaw)) {
      return { success: false };
    }
    const { has_headers: hasHeadersRaw } = csvRaw;
    if (hasHeadersRaw !== undefined && typeof hasHeadersRaw !== "boolean") {
      return { success: false };
    }
    formatSections.push("csv");
    csv = { hasHeaders: (hasHeadersRaw as boolean) ?? false };
  }

  if (jsonRaw !== undefined) {
    if (!isPlainObject(jsonRaw)) {
      return { success: false };
    }
    formatSections.push("json");
  }

  if (parquetRaw !== undefined) {
    if (!isPlainObject(parquetRaw)) {
      return { success: false };
    }
    formatSections.push("parquet");
  }

  if (protobufRaw !== undefined) {
    if (!isPlainObject(protobufRaw)) {
      return { success: false };
    }
    const {
      message_name: messageNameRaw,
      schema: schemaRaw,
      fields: fieldsRaw,
    } = protobufRaw;
    if (messageNameRaw !== undefined && typeof messageNameRaw !== "string") {
      return { success: false };
    }
    if (schemaRaw !== undefined && typeof schemaRaw !== "string") {
      return { success: false };
    }
    const fields: ProtobufFieldRow[] = [];
    if (fieldsRaw !== undefined) {
      if (!isPlainObject(fieldsRaw)) {
        return { success: false };
      }
      for (const [column, rawField] of Object.entries(fieldsRaw)) {
        if (!isPlainObject(rawField)) {
          return { success: false };
        }
        const { id: fieldIdRaw, type: fieldTypeRaw } = rawField;
        if (
          typeof fieldIdRaw !== "number" ||
          typeof fieldTypeRaw !== "string"
        ) {
          return { success: false };
        }
        fields.push({
          id: crypto.randomUUID(),
          column,
          fieldId: String(fieldIdRaw),
          fieldType: fieldTypeRaw,
        });
      }
    }
    formatSections.push("protobuf");
    protobuf = {
      messageName: (messageNameRaw as string) ?? "",
      schema: (schemaRaw as string) ?? "",
      fields,
    };
  }

  if (exportRaw !== undefined) {
    if (!isPlainObject(exportRaw)) {
      return { success: false };
    }
    const { format, rows, duration } = exportRaw;
    if (format !== undefined && typeof format !== "string") {
      return { success: false };
    }
    if (rows !== undefined && typeof rows !== "number") {
      return { success: false };
    }
    if (
      duration !== undefined &&
      typeof duration !== "string" &&
      typeof duration !== "number"
    ) {
      return { success: false };
    }
    formatSections.push("export");
    exportConfig = {
      format: (format as string) ?? "",
      rows: rows !== undefined ? String(rows) : "",
      duration: duration !== undefined ? String(duration) : "",
    };
  }

  let asLabel: KeyValueRow[] = [];
  if (asLabelRaw !== undefined) {
    const rows = parseRowMap(asLabelRaw);
    if (!rows) {
      return { success: false };
    }
    asLabel = rows;
  }

  return {
    success: true,
    transform: {
      kind: "select",
      select: {
        sql: (sql as string) ?? "",
        asLabel,
        formatSections,
        csv,
        protobuf,
        export: exportConfig,
      },
    },
  };
}
