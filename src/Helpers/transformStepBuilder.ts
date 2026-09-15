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

export type SelectInputFormat = "csv" | "json" | "parquet" | "protobuf";

export type SelectFormatSection = SelectInputFormat | "export";

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

export interface SqlStep {
  id: string;
  sql: string;
  asLabel: KeyValueRow[];
  formatSections: SelectFormatSection[];
  csv: CsvConfig;
  protobuf: ProtobufConfig;
  export: SelectExportConfig;
}

export interface SelectTransformStep {
  sqlSteps: SqlStep[];
}

export type TransformStepEntry =
  | { kind: "ros"; ros: RosTransformStep }
  | { kind: "select"; select: SelectTransformStep };

const DEFAULT_SQL = "SELECT * FROM ENTRY()\n";

function blankRow(id: string = crypto.randomUUID()): KeyValueRow {
  return { id, key: "", value: "" };
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

function blankSqlStep(id: string, sql: string): SqlStep {
  return {
    id,
    sql,
    asLabel: [],
    formatSections: [],
    csv: { hasHeaders: false },
    protobuf: { messageName: "", schema: "", fields: [] },
    export: { format: "", rows: "", duration: "" },
  };
}

export function createSelectTransformStep(): Extract<
  TransformStepEntry,
  { kind: "select" }
> {
  return {
    kind: "select",
    select: { sqlSteps: [] },
  };
}

export function updateSqlStep<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
  sql: string,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, id, (step) => ({ ...step, sql })),
  } as Entry;
}

export function addSqlStep<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string = crypto.randomUUID(),
  afterId?: string,
): Entry {
  if (transform.kind !== "select") return transform;
  const { sqlSteps } = transform.select;
  const sql = sqlSteps.length === 0 ? DEFAULT_SQL : "";
  const insertIndex = afterId
    ? sqlSteps.findIndex((step) => step.id === afterId) + 1
    : sqlSteps.length;
  return {
    ...transform,
    select: {
      sqlSteps: [
        ...sqlSteps.slice(0, insertIndex),
        blankSqlStep(id, sql),
        ...sqlSteps.slice(insertIndex),
      ],
    },
  } as Entry;
}

export function removeSqlStep<Entry extends TransformStepEntry>(
  transform: Entry,
  id: string,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: {
      sqlSteps: transform.select.sqlSteps.filter((step) => step.id !== id),
    },
  } as Entry;
}

function mapSqlStep(
  select: SelectTransformStep,
  stepId: string,
  mutate: (step: SqlStep) => SqlStep,
): SelectTransformStep {
  return {
    sqlSteps: select.sqlSteps.map((step) =>
      step.id === stepId ? mutate(step) : step,
    ),
  };
}

export function addFormatSection<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  section: SelectFormatSection,
  fieldId: string = crypto.randomUUID(),
): Entry {
  if (transform.kind !== "select") return transform;
  const target = transform.select.sqlSteps.find((step) => step.id === stepId);
  if (target?.formatSections.includes(section)) {
    return transform;
  }
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => {
      const next = {
        ...step,
        formatSections: [...step.formatSections, section],
      };
      if (section === "protobuf" && next.protobuf.fields.length === 0) {
        next.protobuf = {
          ...next.protobuf,
          fields: [blankProtobufFieldRow(fieldId)],
        };
      }
      return next;
    }),
  } as Entry;
}

export function changeFormat<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  format: SelectInputFormat,
  fieldId: string = crypto.randomUUID(),
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => {
      const formatSections = step.formatSections.filter(
        (s) =>
          s !== "csv" && s !== "json" && s !== "parquet" && s !== "protobuf",
      );
      const next = { ...step, formatSections: [...formatSections, format] };
      if (format === "protobuf" && next.protobuf.fields.length === 0) {
        next.protobuf = {
          ...next.protobuf,
          fields: [blankProtobufFieldRow(fieldId)],
        };
      }
      return next;
    }),
  } as Entry;
}

export function removeFormatSection<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  section: SelectFormatSection,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      formatSections: step.formatSections.filter((s) => s !== section),
    })),
  } as Entry;
}

export function updateCsv<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  changes: Partial<CsvConfig>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      csv: { ...step.csv, ...changes },
    })),
  } as Entry;
}

export function updateProtobuf<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      protobuf: { ...step.protobuf, ...changes },
    })),
  } as Entry;
}

function blankProtobufFieldRow(
  id: string = crypto.randomUUID(),
): ProtobufFieldRow {
  return { id, column: "", fieldId: "", fieldType: "" };
}

export function addProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  id: string = crypto.randomUUID(),
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      protobuf: {
        ...step.protobuf,
        fields: [...step.protobuf.fields, blankProtobufFieldRow(id)],
      },
    })),
  } as Entry;
}

export function updateProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  id: string,
  changes: Partial<Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      protobuf: {
        ...step.protobuf,
        fields: step.protobuf.fields.map((row) =>
          row.id === id ? { ...row, ...changes } : row,
        ),
      },
    })),
  } as Entry;
}

export function removeProtobufFieldRow<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  id: string,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      protobuf: {
        ...step.protobuf,
        fields: step.protobuf.fields.filter((row) => row.id !== id),
      },
    })),
  } as Entry;
}

export function updateSelectExport<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string,
  changes: Partial<SelectExportConfig>,
): Entry {
  if (transform.kind !== "select") return transform;
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId, (step) => ({
      ...step,
      export: { ...step.export, ...changes },
    })),
  } as Entry;
}

export function addSection<Entry extends TransformStepEntry>(
  transform: Entry,
  section: RosSection,
  rowId: string = crypto.randomUUID(),
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
    ros.encode = [blankRow(rowId)];
  }
  if (section === "label" && ros.asLabel.length === 0) {
    ros.asLabel = [blankRow(rowId)];
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

function addRow(
  rows: KeyValueRow[],
  id: string = crypto.randomUUID(),
): KeyValueRow[] {
  return [...rows, blankRow(id)];
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
  id: string = crypto.randomUUID(),
): Entry {
  if (transform.kind !== "ros") return transform;
  return {
    ...transform,
    ros: { ...transform.ros, encode: addRow(transform.ros.encode, id) },
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
  stepId: string | undefined,
  id: string = crypto.randomUUID(),
): Entry {
  if (transform.kind === "ros") {
    return {
      ...transform,
      ros: { ...transform.ros, asLabel: addRow(transform.ros.asLabel, id) },
    } as Entry;
  }
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId as string, (step) => ({
      ...step,
      asLabel: addRow(step.asLabel, id),
    })),
  } as Entry;
}

export function updateAsLabelRow<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string | undefined,
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): Entry {
  if (transform.kind === "ros") {
    return {
      ...transform,
      ros: {
        ...transform.ros,
        asLabel: updateRow(transform.ros.asLabel, id, changes),
      },
    } as Entry;
  }
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId as string, (step) => ({
      ...step,
      asLabel: updateRow(step.asLabel, id, changes),
    })),
  } as Entry;
}

export function removeAsLabelRow<Entry extends TransformStepEntry>(
  transform: Entry,
  stepId: string | undefined,
  id: string,
): Entry {
  if (transform.kind === "ros") {
    return {
      ...transform,
      ros: {
        ...transform.ros,
        asLabel: removeRow(transform.ros.asLabel, id),
      },
    } as Entry;
  }
  return {
    ...transform,
    select: mapSqlStep(transform.select, stepId as string, (step) => ({
      ...step,
      asLabel: removeRow(step.asLabel, id),
    })),
  } as Entry;
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

function isValidProtobufFieldId(fieldId: string): boolean {
  const value = Number(fieldId);
  return Number.isInteger(value) && value > 0;
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
  transforms: TransformStepEntry[],
): boolean {
  return transforms.some((transform) => {
    if (transform.kind === "select") {
      return transform.select.sqlSteps.some((step) => {
        if (hasPartialRow(step.asLabel)) {
          return true;
        }
        return (
          step.formatSections.includes("protobuf") &&
          hasPartialProtobufFieldRow(step.protobuf.fields)
        );
      });
    }
    const { sections, encode, asLabel } = transform.ros;
    if (sections.includes("encode") && hasPartialRow(encode)) {
      return true;
    }
    if (sections.includes("label") && hasPartialRow(asLabel)) {
      return true;
    }
    return false;
  });
}

function rowsToMap(rows: KeyValueRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter(isCompleteRow).map((row) => [row.key.trim(), row.value.trim()]),
  );
}

function buildSqlStageExtras(step: SqlStep): Record<string, unknown> {
  const { formatSections, csv, protobuf, export: exportConfig, asLabel } = step;
  const extras: Record<string, unknown> = {};

  if (formatSections.includes("csv")) {
    // Only sent when checked - omitting has_headers (rather than forcing it
    // to false) lets the server infer it from the content type instead,
    // which is the documented default. The checkbox is only useful to force
    // it on when inference wouldn't otherwise catch it.
    extras.csv = csv.hasHeaders ? { has_headers: true } : {};
  }
  if (formatSections.includes("json")) {
    extras.json = {};
  }
  if (formatSections.includes("parquet")) {
    extras.parquet = {};
  }
  if (formatSections.includes("protobuf")) {
    const completeFields = protobuf.fields.filter(
      (row) =>
        row.column.trim() &&
        row.fieldType.trim() &&
        isValidProtobufFieldId(row.fieldId),
    );
    if (completeFields.length > 0) {
      extras.protobuf = {
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
      extras.protobuf = protobufConfig;
    }
  }

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
    extras.export = exportPayload;
  }

  const asLabelMap = rowsToMap(asLabel);
  if (Object.keys(asLabelMap).length > 0) {
    extras.as_label = asLabelMap;
  }

  return extras;
}

function buildSelectExt(
  select: SelectTransformStep,
): Record<string, unknown>[] {
  if (select.sqlSteps.length === 0) {
    return [{}];
  }
  return select.sqlSteps.map((step) => {
    const stage: Record<string, unknown> = {};
    if (step.sql.trim()) stage.sql = step.sql.trim();
    Object.assign(stage, buildSqlStageExtras(step));
    return stage;
  });
}

function buildRosExt(ros: RosTransformStep): Record<string, unknown> {
  const { sections, topic, encode, asLabel, export: exportConfig } = ros;

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

  const payload: Record<string, unknown> = {};
  // The server only accepts one of extract/export/transform per request, so
  // extract is only ever included when a filter/encode/label section is
  // actually contributing something to it.
  if (Object.keys(extract).length > 0) {
    payload.extract = extract;
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
    payload.export = exportPayload;
  }

  if (Object.keys(payload).length === 0) {
    return { extract: {} };
  }
  return payload;
}

export function buildExtPayload(
  transforms: TransformStepEntry[],
): Record<string, unknown>[] | undefined {
  if (transforms.length === 0) {
    return undefined;
  }
  const ros = transforms.find(
    (transform): transform is Extract<TransformStepEntry, { kind: "ros" }> =>
      transform.kind === "ros",
  );
  const select = transforms.find(
    (transform): transform is Extract<TransformStepEntry, { kind: "select" }> =>
      transform.kind === "select",
  );

  const payload: Record<string, unknown>[] = [];
  if (ros) payload.push({ ros: buildRosExt(ros.ros) });
  if (select) {
    for (const stage of buildSelectExt(select.select)) {
      payload.push({ select: stage });
    }
  }
  return payload.length > 0 ? payload : undefined;
}

export function parseExtPayload(ext: unknown): {
  success: boolean;
  transforms?: TransformStepEntry[];
} {
  if (ext === undefined) {
    return { success: true, transforms: [] };
  }

  if (Array.isArray(ext)) {
    const transforms: TransformStepEntry[] = [];
    const selectStages: unknown[] = [];
    for (const entry of ext) {
      if (!isPlainObject(entry)) {
        return { success: false };
      }
      const keys = Object.keys(entry);
      if (keys.length !== 1) {
        return { success: false };
      }
      const [key] = keys;
      if (key === "ros") {
        const result = parseRosPayload(entry.ros);
        if (!result.success || !result.transform) {
          return { success: false };
        }
        transforms.push(result.transform);
      } else if (key === "select") {
        selectStages.push(entry.select);
      } else {
        return { success: false };
      }
    }
    if (selectStages.length > 0) {
      const result = parseSelectPayload(selectStages);
      if (!result.success || !result.transform) {
        return { success: false };
      }
      transforms.push(result.transform);
    }
    return { success: true, transforms };
  }

  if (!isPlainObject(ext)) {
    return { success: false };
  }
  const { ros, select } = ext;
  if (ros === undefined && select === undefined) {
    return { success: false };
  }

  const transforms: TransformStepEntry[] = [];
  if (ros !== undefined) {
    const result = parseRosPayload(ros);
    if (!result.success || !result.transform) {
      return { success: false };
    }
    transforms.push(result.transform);
  }
  if (select !== undefined) {
    const result = parseSelectPayload(select);
    if (!result.success || !result.transform) {
      return { success: false };
    }
    transforms.push(result.transform);
  }

  return { success: true, transforms };
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

function parseSqlStage(stage: unknown): SqlStep | undefined {
  if (!isPlainObject(stage)) {
    return undefined;
  }
  const {
    sql,
    as_label: asLabelRaw,
    csv: csvRaw,
    json: jsonRaw,
    parquet: parquetRaw,
    protobuf: protobufRaw,
    export: exportRaw,
  } = stage;

  if (sql !== undefined && typeof sql !== "string") {
    return undefined;
  }

  const formatSections: SelectFormatSection[] = [];
  let csv: CsvConfig = { hasHeaders: false };
  let protobuf: ProtobufConfig = { messageName: "", schema: "", fields: [] };
  let exportConfig: SelectExportConfig = { format: "", rows: "", duration: "" };
  let asLabel: KeyValueRow[] = [];

  const presentFormats = [csvRaw, jsonRaw, parquetRaw, protobufRaw].filter(
    (raw) => raw !== undefined,
  ).length;
  if (presentFormats > 1) {
    return undefined;
  }

  if (csvRaw !== undefined) {
    if (!isPlainObject(csvRaw)) {
      return undefined;
    }
    const { has_headers: hasHeadersRaw } = csvRaw;
    if (hasHeadersRaw !== undefined && typeof hasHeadersRaw !== "boolean") {
      return undefined;
    }
    formatSections.push("csv");
    csv = { hasHeaders: (hasHeadersRaw as boolean) ?? false };
  }

  if (jsonRaw !== undefined) {
    if (!isPlainObject(jsonRaw)) {
      return undefined;
    }
    formatSections.push("json");
  }

  if (parquetRaw !== undefined) {
    if (!isPlainObject(parquetRaw)) {
      return undefined;
    }
    formatSections.push("parquet");
  }

  if (protobufRaw !== undefined) {
    if (!isPlainObject(protobufRaw)) {
      return undefined;
    }
    const {
      message_name: messageNameRaw,
      schema: schemaRaw,
      fields: fieldsRaw,
    } = protobufRaw;
    if (messageNameRaw !== undefined && typeof messageNameRaw !== "string") {
      return undefined;
    }
    if (schemaRaw !== undefined && typeof schemaRaw !== "string") {
      return undefined;
    }
    const fields: ProtobufFieldRow[] = [];
    if (fieldsRaw !== undefined) {
      if (!isPlainObject(fieldsRaw)) {
        return undefined;
      }
      for (const [column, rawField] of Object.entries(fieldsRaw)) {
        if (!isPlainObject(rawField)) {
          return undefined;
        }
        const { id: fieldIdRaw, type: fieldTypeRaw } = rawField;
        if (
          typeof fieldIdRaw !== "number" ||
          !Number.isInteger(fieldIdRaw) ||
          fieldIdRaw <= 0 ||
          typeof fieldTypeRaw !== "string"
        ) {
          return undefined;
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
      return undefined;
    }
    const { format, rows, duration } = exportRaw;
    if (format !== undefined && typeof format !== "string") {
      return undefined;
    }
    if (rows !== undefined && typeof rows !== "number") {
      return undefined;
    }
    if (
      duration !== undefined &&
      typeof duration !== "string" &&
      typeof duration !== "number"
    ) {
      return undefined;
    }
    formatSections.push("export");
    exportConfig = {
      format: (format as string) ?? "",
      rows: rows !== undefined ? String(rows) : "",
      duration: duration !== undefined ? String(duration) : "",
    };
  }

  if (asLabelRaw !== undefined) {
    const rows = parseRowMap(asLabelRaw);
    if (!rows) {
      return undefined;
    }
    asLabel = rows;
  }

  return {
    id: crypto.randomUUID(),
    sql: (sql as string) ?? "",
    asLabel,
    formatSections,
    csv,
    protobuf,
    export: exportConfig,
  };
}

function parseSelectPayload(select: unknown): {
  success: boolean;
  transform?: TransformStepEntry;
} {
  const stages = Array.isArray(select) ? select : [select];
  if (stages.length === 0) {
    return { success: false };
  }
  if (
    stages.length === 1 &&
    isPlainObject(stages[0]) &&
    Object.keys(stages[0]).length === 0
  ) {
    return {
      success: true,
      transform: { kind: "select", select: { sqlSteps: [] } },
    };
  }

  const sqlSteps: SqlStep[] = [];
  for (const stage of stages) {
    const step = parseSqlStage(stage);
    if (!step) {
      return { success: false };
    }
    sqlSteps.push(step);
  }

  return {
    success: true,
    transform: { kind: "select", select: { sqlSteps } },
  };
}
