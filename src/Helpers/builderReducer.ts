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
  parseQueryValue,
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
  PROCESS_BLOCK_ID,
  RosExportConfig,
  RosSection,
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
  updateSqlStep,
  addSqlStep,
  removeSqlStep,
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

function appendBlockId(blockOrder: string[], id: string): string[] {
  return [...blockOrder, id];
}

function removeBlockId(blockOrder: string[], id: string): string[] {
  return blockOrder.filter((blockId) => blockId !== id);
}

function insertBlockId(
  blockOrder: string[],
  id: string,
  anchorId: string,
  position: "before" | "after",
): string[] {
  const anchorIndex = blockOrder.indexOf(anchorId);
  if (anchorIndex === -1) return appendBlockId(blockOrder, id);
  const insertAt = position === "before" ? anchorIndex : anchorIndex + 1;
  const next = [...blockOrder];
  next.splice(insertAt, 0, id);
  return next;
}

export interface BuilderState {
  conditions: FlatCondition[];
  steps: Step[];
  transforms: TransformStepEntry[];
  blockOrder: string[];
  enabled: Record<string, boolean>;
  pendingStages: string[];
}

export function isStageEnabled(state: BuilderState, id: string): boolean {
  return state.enabled[id] ?? true;
}

// A stage created via "+ Add stage" before its type has been chosen from the
// dropdown - it has an id and a place in blockOrder, but no backing
// condition/step/transform data yet.
export type StageKind =
  | "conditions"
  | "ext"
  | "sample_each_n"
  | "sample_each_t"
  | "limit";

function replaceBlockId(
  blockOrder: string[],
  oldId: string,
  newId: string,
): string[] {
  return blockOrder.map((id) => (id === oldId ? newId : id));
}

export function currentStageKind(
  state: BuilderState,
  id: string,
): StageKind | null {
  if (state.pendingStages.includes(id)) return null;
  if (id === CONDITIONS_BLOCK_ID) return "conditions";
  if (id === PROCESS_BLOCK_ID) return "ext";
  const step = state.steps.find((s) => s.id === id);
  if (step?.type === "each_n") return "sample_each_n";
  if (step?.type === "each_t") return "sample_each_t";
  if (step?.type === "limit") return "limit";
  return null;
}

function sentinelForKind(kind: StageKind): string | null {
  if (kind === "conditions") return CONDITIONS_BLOCK_ID;
  if (kind === "ext") return PROCESS_BLOCK_ID;
  return null;
}

function appendStep(state: BuilderState, steps: Step[]): BuilderState {
  return {
    ...state,
    steps,
    blockOrder: appendBlockId(state.blockOrder, steps[steps.length - 1].id),
  };
}

export type BuilderAction =
  | { type: "condition/add"; id: string }
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
  | { type: "ros/addSection"; section: RosSection; rowId: string }
  | { type: "ros/removeSection"; section: RosSection }
  | { type: "ros/changeTopic"; topic: string }
  | { type: "ros/addEncodeRow"; id: string }
  | {
      type: "ros/changeEncodeRow";
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | { type: "ros/removeEncodeRow"; id: string }
  | { type: "ros/changeExport"; changes: Partial<RosExportConfig> }
  | { type: "select/changeSql"; id: string; sql: string }
  | { type: "select/addSqlStep"; id: string }
  | { type: "select/removeSqlStep"; id: string }
  | {
      type: "select/addFormatSection";
      stepId: string;
      section: SelectFormatSection;
      fieldId: string;
    }
  | {
      type: "select/removeFormatSection";
      stepId: string;
      section: SelectFormatSection;
    }
  | {
      type: "select/changeFormat";
      stepId: string;
      format: SelectInputFormat;
      fieldId: string;
    }
  | { type: "select/changeCsv"; stepId: string; changes: Partial<CsvConfig> }
  | {
      type: "select/changeProtobuf";
      stepId: string;
      changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>;
    }
  | { type: "select/addProtobufFieldRow"; stepId: string; id: string }
  | {
      type: "select/changeProtobufFieldRow";
      stepId: string;
      id: string;
      changes: Partial<
        Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
      >;
    }
  | { type: "select/removeProtobufFieldRow"; stepId: string; id: string }
  | {
      type: "select/changeExport";
      stepId: string;
      changes: Partial<SelectExportConfig>;
    }
  | {
      type: "transform/addAsLabelRow";
      kind: TransformKind;
      stepId?: string;
      id: string;
    }
  | {
      type: "transform/changeAsLabelRow";
      kind: TransformKind;
      stepId?: string;
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | {
      type: "transform/removeAsLabelRow";
      kind: TransformKind;
      stepId?: string;
      id: string;
    }
  | { type: "block/addConditions"; id: string }
  | { type: "block/removeConditions" }
  | { type: "block/addEachT"; id: string }
  | { type: "block/addEachN"; id: string }
  | { type: "block/addLimit"; id: string }
  | { type: "block/addTransform"; kind: TransformKind }
  | { type: "block/removeTransform"; kind: TransformKind }
  | { type: "block/reorder"; fromIndex: number; toIndex: number }
  | { type: "stage/toggleEnabled"; id: string }
  | { type: "stage/add"; id: string }
  | {
      type: "stage/insert";
      id: string;
      anchorId: string;
      position: "before" | "after";
    }
  | { type: "stage/setKind"; id: string; kind: StageKind }
  | { type: "stage/removePending"; id: string }
  | { type: "step/remove"; id: string }
  | { type: "external/sync"; state: BuilderState };

export function builderReducer(
  state: BuilderState,
  action: BuilderAction,
): BuilderState {
  switch (action.type) {
    case "condition/add":
      return {
        ...state,
        conditions: addCondition(state.conditions, action.id),
      };
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
          addSection(transform, action.section, action.rowId),
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
        transforms: mapTransform(state.transforms, "ros", (transform) =>
          addEncodeRow(transform, action.id),
        ),
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
          updateSqlStep(transform, action.id, action.sql),
        ),
      };
    case "select/addSqlStep":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          addSqlStep(transform, action.id),
        ),
      };
    case "select/removeSqlStep":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeSqlStep(transform, action.id),
        ),
      };
    case "select/addFormatSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          addFormatSection(
            transform,
            action.stepId,
            action.section,
            action.fieldId,
          ),
        ),
      };
    case "select/removeFormatSection":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeFormatSection(transform, action.stepId, action.section),
        ),
      };
    case "select/changeFormat":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          changeFormat(transform, action.stepId, action.format, action.fieldId),
        ),
      };
    case "select/changeCsv":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateCsv(transform, action.stepId, action.changes),
        ),
      };
    case "select/changeProtobuf":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateProtobuf(transform, action.stepId, action.changes),
        ),
      };
    case "select/addProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          addProtobufFieldRow(transform, action.stepId, action.id),
        ),
      };
    case "select/changeProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateProtobufFieldRow(
            transform,
            action.stepId,
            action.id,
            action.changes,
          ),
        ),
      };
    case "select/removeProtobufFieldRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          removeProtobufFieldRow(transform, action.stepId, action.id),
        ),
      };
    case "select/changeExport":
      return {
        ...state,
        transforms: mapTransform(state.transforms, "select", (transform) =>
          updateSelectExport(transform, action.stepId, action.changes),
        ),
      };
    case "transform/addAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, action.kind, (transform) =>
          addAsLabelRow(transform, action.stepId, action.id),
        ),
      };
    case "transform/changeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, action.kind, (transform) =>
          updateAsLabelRow(transform, action.stepId, action.id, action.changes),
        ),
      };
    case "transform/removeAsLabelRow":
      return {
        ...state,
        transforms: mapTransform(state.transforms, action.kind, (transform) =>
          removeAsLabelRow(transform, action.stepId, action.id),
        ),
      };
    case "block/addConditions":
      return {
        ...state,
        conditions: addCondition(state.conditions, action.id),
        blockOrder: appendBlockId(state.blockOrder, CONDITIONS_BLOCK_ID),
      };
    case "block/removeConditions":
      return {
        ...state,
        conditions: [],
        blockOrder: removeBlockId(state.blockOrder, CONDITIONS_BLOCK_ID),
      };
    case "block/addEachT":
      return appendStep(state, addEachTStep(state.steps, action.id));
    case "block/addEachN":
      return appendStep(state, addEachNStep(state.steps, action.id));
    case "block/addLimit":
      return appendStep(state, addLimitStep(state.steps, action.id));
    case "block/addTransform": {
      const newTransform =
        action.kind === "ros"
          ? createRosTransformStep()
          : createSelectTransformStep();
      return {
        ...state,
        transforms: [...state.transforms, newTransform],
        blockOrder: state.blockOrder.includes(PROCESS_BLOCK_ID)
          ? state.blockOrder
          : appendBlockId(state.blockOrder, PROCESS_BLOCK_ID),
      };
    }
    case "block/removeTransform": {
      const transforms = state.transforms.filter(
        (transform) => transform.kind !== action.kind,
      );
      return {
        ...state,
        transforms,
        blockOrder:
          transforms.length === 0
            ? removeBlockId(state.blockOrder, PROCESS_BLOCK_ID)
            : state.blockOrder,
      };
    }
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
        blockOrder: removeBlockId(state.blockOrder, action.id),
      };
    case "stage/toggleEnabled":
      return {
        ...state,
        enabled: {
          ...state.enabled,
          [action.id]: !isStageEnabled(state, action.id),
        },
      };
    case "stage/add":
      return {
        ...state,
        blockOrder: appendBlockId(state.blockOrder, action.id),
        pendingStages: [...state.pendingStages, action.id],
      };
    case "stage/insert":
      return {
        ...state,
        blockOrder: insertBlockId(
          state.blockOrder,
          action.id,
          action.anchorId,
          action.position,
        ),
        pendingStages: [...state.pendingStages, action.id],
      };
    case "stage/removePending":
      return {
        ...state,
        blockOrder: removeBlockId(state.blockOrder, action.id),
        pendingStages: state.pendingStages.filter((id) => id !== action.id),
      };
    case "stage/setKind": {
      const { id, kind } = action;
      const previousKind = currentStageKind(state, id);
      if (previousKind === kind) {
        return state;
      }

      // Tear down whatever this id previously represented.
      let { conditions, steps, transforms } = state;
      if (previousKind === "conditions") conditions = [];
      else if (previousKind === "ext") transforms = [];
      else if (previousKind !== null) steps = removeStep(steps, id);

      // Sentinel-based kinds (conditions/ext) always live at their fixed id;
      // everything else needs a fresh id when moving off a sentinel slot,
      // or can keep reusing its own id otherwise.
      const newSentinel = sentinelForKind(kind);
      const previousSentinel = previousKind
        ? sentinelForKind(previousKind)
        : null;
      const newId =
        newSentinel ?? (previousSentinel ? crypto.randomUUID() : id);

      if (kind === "conditions") {
        conditions = addCondition(conditions, crypto.randomUUID());
      } else if (kind === "sample_each_n") {
        steps = addEachNStep(steps, newId);
      } else if (kind === "sample_each_t") {
        steps = addEachTStep(steps, newId);
      } else if (kind === "limit") {
        steps = addLimitStep(steps, newId);
      }
      // kind === "ext": no transform created yet - ROS/Select are added from
      // within the stage itself once #ext is chosen.

      return {
        ...state,
        conditions,
        steps,
        transforms,
        blockOrder: replaceBlockId(state.blockOrder, id, newId),
        pendingStages: state.pendingStages.filter((pid) => pid !== id),
      };
    }
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
    ...(transforms.length > 0 ? [PROCESS_BLOCK_ID] : []),
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
    return parseQueryValue(text);
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
        : blockId === PROCESS_BLOCK_ID
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
  const effectiveConditions = isStageEnabled(state, CONDITIONS_BLOCK_ID)
    ? state.conditions
    : [];
  const effectiveSteps = state.steps.filter((step) =>
    isStageEnabled(state, step.id),
  );
  const effectiveTransforms = isStageEnabled(state, PROCESS_BLOCK_ID)
    ? state.transforms
    : [];

  const extPayload = buildExtPayload(effectiveTransforms);
  const merged = {
    ...serializeBuilderList(effectiveConditions),
    ...serializeSteps(effectiveSteps),
    ...(extPayload ? { "#ext": extPayload } : {}),
  };
  const ordered = reorderQueryKeys(merged, state.blockOrder, state.steps);
  return formatAsStrictJSON(ordered);
}
