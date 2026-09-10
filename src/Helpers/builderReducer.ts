import {
  CONDITIONS_BLOCK_ID,
  EachNStep,
  EachTStep,
  FlatCondition,
  LimitStep,
  Step,
  addCondition,
  addEachNStep,
  addEachTStep,
  addLimitStep,
  moveItem,
  parseBuilderList,
  removeCondition,
  removeStep,
  serializeBuilderList,
  serializeSteps,
  updateCondition,
  updateEachNStep,
  updateEachTStep,
  updateLimitStep,
} from "./conditionalQueryBuilder";
import {
  CsvConfig,
  KeyValueRow,
  ProtobufConfig,
  ProtobufFieldRow,
  ROS_TRANSFORM_BLOCK_ID,
  RosExportConfig,
  RosSection,
  SELECT_TRANSFORM_BLOCK_ID,
  SelectExportConfig,
  SelectFormatSection,
  SelectInputFormat,
  TransformKind,
  TransformStepEntry,
  addAsLabelRow,
  addEncodeRow,
  addFormatSection,
  addProtobufFieldRow,
  addSection,
  buildExtPayload,
  changeFormat,
  createRosTransformStep,
  createSelectTransformStep,
  parseExtPayload,
  transformBlockId,
  removeAsLabelRow,
  removeEncodeRow,
  removeFormatSection,
  removeProtobufFieldRow,
  removeSection,
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
import { formatAsStrictJSON, safeParseJSON5 } from "./json5Utils";

function mapTransform(
  transforms: TransformStepEntry[],
  kind: TransformStepEntry["kind"],
  mutate: (transform: TransformStepEntry) => TransformStepEntry,
): TransformStepEntry[] {
  return transforms.map((transform) =>
    transform.kind === kind ? mutate(transform) : transform,
  );
}

export interface BuilderState {
  conditions: FlatCondition[];
  steps: Step[];
  transforms: TransformStepEntry[];
  blockOrder: string[];
}

export type BuilderAction =
  | { type: "condition/add" }
  | { type: "condition/remove"; id: string }
  | {
      type: "condition/change";
      id: string;
      changes: Partial<
        Pick<
          FlatCondition,
          "label" | "operator" | "value" | "negated" | "connector"
        >
      >;
    }
  | { type: "step/changeEachN"; id: string; changes: Partial<EachNStep> }
  | { type: "step/changeEachT"; id: string; changes: Partial<EachTStep> }
  | { type: "step/changeLimit"; id: string; changes: Partial<LimitStep> }
  | { type: "ros/addSection"; section: RosSection }
  | { type: "ros/removeSection"; section: RosSection }
  | { type: "ros/changeTopic"; topic: string }
  | { type: "ros/addEncodeRow" }
  | {
      type: "ros/changeEncodeRow";
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | { type: "ros/removeEncodeRow"; id: string }
  | { type: "ros/addAsLabelRow" }
  | {
      type: "ros/changeAsLabelRow";
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | { type: "ros/removeAsLabelRow"; id: string }
  | { type: "ros/changeExport"; changes: Partial<RosExportConfig> }
  | { type: "select/changeSql"; sql: string }
  | { type: "select/addFormatSection"; section: SelectFormatSection }
  | { type: "select/removeFormatSection"; section: SelectFormatSection }
  | { type: "select/changeFormat"; format: SelectInputFormat }
  | { type: "select/changeCsv"; changes: Partial<CsvConfig> }
  | {
      type: "select/changeProtobuf";
      changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>;
    }
  | { type: "select/addProtobufFieldRow" }
  | {
      type: "select/changeProtobufFieldRow";
      id: string;
      changes: Partial<
        Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
      >;
    }
  | { type: "select/removeProtobufFieldRow"; id: string }
  | { type: "select/changeExport"; changes: Partial<SelectExportConfig> }
  | { type: "select/addAsLabelRow" }
  | {
      type: "select/changeAsLabelRow";
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | { type: "select/removeAsLabelRow"; id: string }
  | { type: "block/addConditions" }
  | { type: "block/removeConditions" }
  | { type: "block/addEachT" }
  | { type: "block/addEachN" }
  | { type: "block/addLimit" }
  | { type: "block/addTransform"; kind: TransformKind }
  | { type: "block/removeTransform"; kind: TransformKind }
  | { type: "block/reorder"; fromIndex: number; toIndex: number }
  | { type: "step/remove"; id: string }
  | { type: "external/sync"; state: BuilderState };

export function builderReducer(
  state: BuilderState,
  action: BuilderAction,
): BuilderState {
  switch (action.type) {
    case "condition/add":
      return { ...state, conditions: addCondition(state.conditions) };
    case "condition/remove":
      return {
        ...state,
        conditions: removeCondition(state.conditions, action.id),
      };
    case "condition/change":
      return {
        ...state,
        conditions: updateCondition(
          state.conditions,
          action.id,
          action.changes,
        ),
      };
    case "step/changeEachN":
      return {
        ...state,
        steps: updateEachNStep(state.steps, action.id, action.changes),
      };
    case "step/changeEachT":
      return {
        ...state,
        steps: updateEachTStep(state.steps, action.id, action.changes),
      };
    case "step/changeLimit":
      return {
        ...state,
        steps: updateLimitStep(state.steps, action.id, action.changes),
      };
    case "ros/addSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          addSection(transform, action.section),
        ),
      };
    case "ros/removeSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          removeSection(transform, action.section),
        ),
      };
    case "ros/changeTopic":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          updateTopic(transform, action.topic),
        ),
      };
    case "ros/addEncodeRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", addEncodeRow),
      };
    case "ros/changeEncodeRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          updateEncodeRow(transform, action.id, action.changes),
        ),
      };
    case "ros/removeEncodeRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          removeEncodeRow(transform, action.id),
        ),
      };
    case "ros/addAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", addAsLabelRow),
      };
    case "ros/changeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          updateAsLabelRow(transform, action.id, action.changes),
        ),
      };
    case "ros/removeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          removeAsLabelRow(transform, action.id),
        ),
      };
    case "ros/changeExport":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          updateExport(transform, action.changes),
        ),
      };
    case "select/changeSql":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateSql(transform, action.sql),
        ),
      };
    case "select/addFormatSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          addFormatSection(transform, action.section),
        ),
      };
    case "select/removeFormatSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeFormatSection(transform, action.section),
        ),
      };
    case "select/changeFormat":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          changeFormat(transform, action.format),
        ),
      };
    case "select/changeCsv":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateCsv(transform, action.changes),
        ),
      };
    case "select/changeProtobuf":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateProtobuf(transform, action.changes),
        ),
      };
    case "select/addProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(
          state.transforms,
          "select",
          addProtobufFieldRow,
        ),
      };
    case "select/changeProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateProtobufFieldRow(transform, action.id, action.changes),
        ),
      };
    case "select/removeProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeProtobufFieldRow(transform, action.id),
        ),
      };
    case "select/changeExport":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateSelectExport(transform, action.changes),
        ),
      };
    case "select/addAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", addAsLabelRow),
      };
    case "select/changeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateAsLabelRow(transform, action.id, action.changes),
        ),
      };
    case "select/removeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeAsLabelRow(transform, action.id),
        ),
      };
    case "block/addConditions":
      return {
        ...state,
        conditions: addCondition(state.conditions),
        blockOrder: [...state.blockOrder, CONDITIONS_BLOCK_ID],
      };
    case "block/removeConditions":
      return {
        ...state,
        conditions: [],
        blockOrder: state.blockOrder.filter((id) => id !== CONDITIONS_BLOCK_ID),
      };
    case "block/addEachT": {
      const steps = addEachTStep(state.steps);
      return {
        ...state,
        steps,
        blockOrder: [...state.blockOrder, steps[steps.length - 1].id],
      };
    }
    case "block/addEachN": {
      const steps = addEachNStep(state.steps);
      return {
        ...state,
        steps,
        blockOrder: [...state.blockOrder, steps[steps.length - 1].id],
      };
    }
    case "block/addLimit": {
      const steps = addLimitStep(state.steps);
      return {
        ...state,
        steps,
        blockOrder: [...state.blockOrder, steps[steps.length - 1].id],
      };
    }
    case "block/addTransform": {
      const newTransform =
        action.kind === "ros"
          ? createRosTransformStep()
          : createSelectTransformStep();
      return {
        ...state,
        transforms: [...state.transforms, newTransform],
        blockOrder: [...state.blockOrder, transformBlockId(action.kind)],
      };
    }
    case "block/removeTransform":
      return {
        ...state,
        transforms: state.transforms.filter(
          (transform) => transform.kind !== action.kind,
        ),
        blockOrder: state.blockOrder.filter(
          (id) => id !== transformBlockId(action.kind),
        ),
      };
    case "block/reorder":
      return {
        ...state,
        blockOrder: moveItem(
          state.blockOrder,
          action.fromIndex,
          action.toIndex,
        ),
      };
    case "step/remove":
      return {
        ...state,
        steps: removeStep(state.steps, action.id),
        blockOrder: state.blockOrder.filter((id) => id !== action.id),
      };
    case "external/sync":
      return action.state;
    default:
      return state;
  }
}

export function initialBlockOrder(
  conditions: FlatCondition[],
  steps: Step[],
  transforms: TransformStepEntry[],
): string[] {
  return [
    ...(conditions.length > 0 ? [CONDITIONS_BLOCK_ID] : []),
    ...steps.map((step) => step.id),
    ...transforms.map((transform) => transformBlockId(transform.kind)),
  ];
}

export interface ParsedQueryAndTransform {
  list: FlatCondition[];
  steps?: Step[];
  transforms?: TransformStepEntry[];
}

export function parseQueryAndTransform(
  text: string,
): ParsedQueryAndTransform | undefined {
  const parsed = safeParseJSON5(text);
  if (!parsed.success) {
    return undefined;
  }
  const raw = parsed.value;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    const result = parseBuilderList(raw);
    return result.success
      ? { list: result.list ?? [], steps: result.steps }
      : undefined;
  }
  const { "#ext": ext, ...rest } = raw as Record<string, unknown>;
  const extResult = parseExtPayload(ext);
  if (!extResult.success) {
    return undefined;
  }
  const result = parseBuilderList(rest);
  if (!result.success) {
    return undefined;
  }
  return {
    list: result.list ?? [],
    steps: result.steps,
    transforms: extResult.transforms,
  };
}

const STEP_KEYS: Record<Step["type"], string> = {
  each_n: "$each_n",
  each_t: "$each_t",
  limit: "$limit",
};

function reorderQueryKeys(
  value: Record<string, unknown>,
  blockOrder: string[],
  steps: Step[],
): Record<string, unknown> {
  const stepKeyById = new Map(
    steps.map((step) => [step.id, STEP_KEYS[step.type]]),
  );
  const conditionsKey = Object.keys(value).find(
    (key) =>
      key !== "$each_n" &&
      key !== "$each_t" &&
      key !== "$limit" &&
      key !== "#ext",
  );

  const orderedKeys: string[] = [];
  for (const blockId of blockOrder) {
    const key =
      blockId === CONDITIONS_BLOCK_ID
        ? conditionsKey
        : blockId === ROS_TRANSFORM_BLOCK_ID ||
            blockId === SELECT_TRANSFORM_BLOCK_ID
          ? "#ext"
          : stepKeyById.get(blockId);
    if (key !== undefined && key in value && !orderedKeys.includes(key)) {
      orderedKeys.push(key);
    }
  }
  const remainingKeys = Object.keys(value).filter(
    (key) => !orderedKeys.includes(key),
  );

  const result: Record<string, unknown> = {};
  for (const key of [...orderedKeys, ...remainingKeys]) {
    result[key] = value[key];
  }
  return result;
}

export function serialize(state: BuilderState): string {
  const extPayload = buildExtPayload(state.transforms);
  const merged = {
    ...serializeBuilderList(state.conditions),
    ...serializeSteps(state.steps),
    ...(extPayload ? { "#ext": extPayload } : {}),
  };
  const ordered = reorderQueryKeys(merged, state.blockOrder, state.steps);
  return formatAsStrictJSON(ordered);
}
