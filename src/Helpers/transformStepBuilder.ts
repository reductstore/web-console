export type TransformKind = "ros";

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

export interface TransformStepEntry {
  kind: TransformKind;
  ros: RosTransformStep;
}

export const TRANSFORM_BLOCK_ID = "transform";

function blankRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: "", value: "" };
}

export function createRosTransformStep(): TransformStepEntry {
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

export function addSection(
  transform: TransformStepEntry,
  section: RosSection,
): TransformStepEntry {
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
  return { ...transform, ros };
}

export function removeSection(
  transform: TransformStepEntry,
  section: RosSection,
): TransformStepEntry {
  return {
    ...transform,
    ros: {
      ...transform.ros,
      sections: transform.ros.sections.filter((s) => s !== section),
    },
  };
}

export function updateTopic(
  transform: TransformStepEntry,
  topic: string,
): TransformStepEntry {
  return { ...transform, ros: { ...transform.ros, topic } };
}

export function updateExport(
  transform: TransformStepEntry,
  changes: Partial<RosExportConfig>,
): TransformStepEntry {
  return {
    ...transform,
    ros: { ...transform.ros, export: { ...transform.ros.export, ...changes } },
  };
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

export function addEncodeRow(
  transform: TransformStepEntry,
): TransformStepEntry {
  return {
    ...transform,
    ros: { ...transform.ros, encode: addRow(transform.ros.encode) },
  };
}

export function updateEncodeRow(
  transform: TransformStepEntry,
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): TransformStepEntry {
  return {
    ...transform,
    ros: {
      ...transform.ros,
      encode: updateRow(transform.ros.encode, id, changes),
    },
  };
}

export function removeEncodeRow(
  transform: TransformStepEntry,
  id: string,
): TransformStepEntry {
  return {
    ...transform,
    ros: { ...transform.ros, encode: removeRow(transform.ros.encode, id) },
  };
}

export function addAsLabelRow(
  transform: TransformStepEntry,
): TransformStepEntry {
  return {
    ...transform,
    ros: { ...transform.ros, asLabel: addRow(transform.ros.asLabel) },
  };
}

export function updateAsLabelRow(
  transform: TransformStepEntry,
  id: string,
  changes: Partial<Pick<KeyValueRow, "key" | "value">>,
): TransformStepEntry {
  return {
    ...transform,
    ros: {
      ...transform.ros,
      asLabel: updateRow(transform.ros.asLabel, id, changes),
    },
  };
}

export function removeAsLabelRow(
  transform: TransformStepEntry,
  id: string,
): TransformStepEntry {
  return {
    ...transform,
    ros: { ...transform.ros, asLabel: removeRow(transform.ros.asLabel, id) },
  };
}

function isCompleteRow(row: KeyValueRow): boolean {
  return row.key.trim() !== "" && row.value.trim() !== "";
}

function hasPartialRow(rows: KeyValueRow[]): boolean {
  return rows.some(
    (row) => (row.key.trim() !== "") !== (row.value.trim() !== ""),
  );
}

export function hasIncompleteTransform(
  transform: TransformStepEntry | undefined,
): boolean {
  if (!transform) {
    return false;
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
    if (Object.keys(exportPayload).length > 0) {
      ros.export = exportPayload;
    }
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
  if (typeof ext !== "object" || ext === null) {
    return { success: false };
  }
  const { ros } = ext as Record<string, unknown>;
  if (typeof ros !== "object" || ros === null) {
    return { success: false };
  }
  const { extract, export: exportRaw } = ros as Record<string, unknown>;

  const sections: RosSection[] = [];
  let topic = "";
  let encode: KeyValueRow[] = [];
  let asLabel: KeyValueRow[] = [];

  if (extract !== undefined) {
    if (typeof extract !== "object" || extract === null) {
      return { success: false };
    }
    const {
      topic: topicRaw,
      encode: encodeRaw,
      as_label: asLabelRaw,
    } = extract as Record<string, unknown>;

    if (topicRaw !== undefined) {
      if (typeof topicRaw !== "string") {
        return { success: false };
      }
      sections.push("filter");
      topic = topicRaw;
    }

    if (encodeRaw !== undefined) {
      if (
        typeof encodeRaw !== "object" ||
        encodeRaw === null ||
        Array.isArray(encodeRaw)
      ) {
        return { success: false };
      }
      sections.push("encode");
      encode = Object.entries(encodeRaw as Record<string, unknown>).map(
        ([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: typeof value === "string" ? value : String(value),
        }),
      );
      if (encode.length === 0) {
        encode = [blankRow()];
      }
    }

    if (asLabelRaw !== undefined) {
      if (
        typeof asLabelRaw !== "object" ||
        asLabelRaw === null ||
        Array.isArray(asLabelRaw)
      ) {
        return { success: false };
      }
      sections.push("label");
      asLabel = Object.entries(asLabelRaw as Record<string, unknown>).map(
        ([key, value]) => ({
          id: crypto.randomUUID(),
          key,
          value: typeof value === "string" ? value : String(value),
        }),
      );
      if (asLabel.length === 0) {
        asLabel = [blankRow()];
      }
    }
  }

  let exportConfig: RosExportConfig = { format: "", duration: "", size: "" };
  if (exportRaw !== undefined) {
    if (typeof exportRaw !== "object" || exportRaw === null) {
      return { success: false };
    }
    const { format, duration, size } = exportRaw as Record<string, unknown>;
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
