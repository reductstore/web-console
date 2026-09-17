import {
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
  addFormatStep,
  addAsLabelStep,
  setSql,
  removeSql,
  updateTopic,
} from "./transformStepBuilder";
import { formatAsStrictJSON, safeParseJSON5 } from "./json5Utils";
import { v4 as uuidv4 } from "uuid";

export interface ExtBlock {
  id: string;
  transforms: TransformStepEntry[];
}

export interface ConditionBlock {
  id: string;
  conditions: FlatCondition[];
}

function mapConditionsInBlock(
  conditionBlocks: ConditionBlock[],
  blockId: string,
  mutate: (conditions: FlatCondition[]) => FlatCondition[],
): ConditionBlock[] {
  return conditionBlocks.map((block) =>
    block.id === blockId
      ? { ...block, conditions: mutate(block.conditions) }
      : block,
  );
}

function mapTransformInBlock(
  extBlocks: ExtBlock[],
  blockId: string,
  kind: TransformStepEntry["kind"],
  mutate: (transform: TransformStepEntry) => TransformStepEntry,
): ExtBlock[] {
  return extBlocks.map((block) =>
    block.id === blockId
      ? {
          ...block,
          transforms: block.transforms.map((transform) =>
            transform.kind === kind ? mutate(transform) : transform,
          ),
        }
      : block,
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
  conditionBlocks: ConditionBlock[];
  steps: Step[];
  extBlocks: ExtBlock[];
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

function currentStageKind(state: BuilderState, id: string): StageKind | null {
  if (state.pendingStages.includes(id)) return null;
  if (state.conditionBlocks.some((block) => block.id === id)) {
    return "conditions";
  }
  if (state.extBlocks.some((block) => block.id === id)) return "ext";
  const step = state.steps.find((s) => s.id === id);
  if (step?.type === "each_n") return "sample_each_n";
  if (step?.type === "each_t") return "sample_each_t";
  if (step?.type === "limit") return "limit";
  return null;
}

export type BuilderAction =
  | { type: "condition/add"; blockId: string; id: string }
  | { type: "condition/remove"; blockId: string; id: string }
  | {
      type: "condition/change";
      blockId: string;
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
  | {
      type: "ros/addSection";
      blockId: string;
      section: RosSection;
      rowId: string;
    }
  | { type: "ros/removeSection"; blockId: string; section: RosSection }
  | { type: "ros/changeTopic"; blockId: string; topic: string }
  | { type: "ros/addEncodeRow"; blockId: string; id: string }
  | {
      type: "ros/changeEncodeRow";
      blockId: string;
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | { type: "ros/removeEncodeRow"; blockId: string; id: string }
  | {
      type: "ros/changeExport";
      blockId: string;
      changes: Partial<RosExportConfig>;
    }
  | { type: "select/changeSql"; blockId: string; id: string; sql: string }
  | {
      type: "select/addSqlStep";
      blockId: string;
      id: string;
      afterId?: string;
    }
  | { type: "select/setSql"; blockId: string; stepId: string; sql?: string }
  | { type: "select/removeSql"; blockId: string; stepId: string }
  | {
      type: "select/addFormatStep";
      blockId: string;
      section: SelectFormatSection;
      id: string;
      fieldId: string;
      afterId?: string;
    }
  | {
      type: "select/addAsLabelStep";
      blockId: string;
      id: string;
      rowId: string;
      afterId?: string;
    }
  | {
      type: "select/addFormatSection";
      blockId: string;
      stepId: string;
      section: SelectFormatSection;
      fieldId: string;
    }
  | {
      type: "select/removeFormatSection";
      blockId: string;
      stepId: string;
      section: SelectFormatSection;
    }
  | {
      type: "select/changeFormat";
      blockId: string;
      stepId: string;
      format: SelectInputFormat;
      fieldId: string;
    }
  | {
      type: "select/changeCsv";
      blockId: string;
      stepId: string;
      changes: Partial<CsvConfig>;
    }
  | {
      type: "select/changeProtobuf";
      blockId: string;
      stepId: string;
      changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>;
    }
  | {
      type: "select/addProtobufFieldRow";
      blockId: string;
      stepId: string;
      id: string;
    }
  | {
      type: "select/changeProtobufFieldRow";
      blockId: string;
      stepId: string;
      id: string;
      changes: Partial<
        Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
      >;
    }
  | {
      type: "select/removeProtobufFieldRow";
      blockId: string;
      stepId: string;
      id: string;
    }
  | {
      type: "select/changeExport";
      blockId: string;
      stepId: string;
      changes: Partial<SelectExportConfig>;
    }
  | {
      type: "transform/addAsLabelRow";
      blockId: string;
      kind: TransformKind;
      stepId?: string;
      id: string;
    }
  | {
      type: "transform/changeAsLabelRow";
      blockId: string;
      kind: TransformKind;
      stepId?: string;
      id: string;
      changes: Partial<Pick<KeyValueRow, "key" | "value">>;
    }
  | {
      type: "transform/removeAsLabelRow";
      blockId: string;
      kind: TransformKind;
      stepId?: string;
      id: string;
    }
  | { type: "block/removeConditionBlock"; blockId: string }
  | { type: "block/removeExt"; blockId: string }
  | { type: "block/addTransform"; blockId: string; kind: TransformKind }
  | { type: "block/removeTransform"; blockId: string; kind: TransformKind }
  | { type: "block/reorder"; fromIndex: number; toIndex: number }
  | { type: "stage/toggleEnabled"; id: string }
  | { type: "stage/add"; id: string }
  | {
      type: "stage/insert";
      id: string;
      anchorId: string;
      position: "before" | "after";
    }
  | { type: "stage/setKind"; id: string; kind: StageKind | null }
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
        conditionBlocks: mapConditionsInBlock(
          state.conditionBlocks,
          action.blockId,
          (conditions) => addCondition(conditions, action.id),
        ),
      };
    case "condition/remove":
      return {
        ...state,
        conditionBlocks: mapConditionsInBlock(
          state.conditionBlocks,
          action.blockId,
          (conditions) => removeCondition(conditions, action.id),
        ),
      };
    case "condition/change":
      return {
        ...state,
        conditionBlocks: mapConditionsInBlock(
          state.conditionBlocks,
          action.blockId,
          (conditions) =>
            updateCondition(conditions, action.id, action.changes),
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
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => addSection(transform, action.section, action.rowId),
        ),
      };
    case "ros/removeSection":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => removeSection(transform, action.section),
        ),
      };
    case "ros/changeTopic":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => updateTopic(transform, action.topic),
        ),
      };
    case "ros/addEncodeRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => addEncodeRow(transform, action.id),
        ),
      };
    case "ros/changeEncodeRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => updateEncodeRow(transform, action.id, action.changes),
        ),
      };
    case "ros/removeEncodeRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => removeEncodeRow(transform, action.id),
        ),
      };
    case "ros/changeExport":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "ros",
          (transform) => updateExport(transform, action.changes),
        ),
      };
    case "select/changeSql":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) => updateSqlStep(transform, action.id, action.sql),
        ),
      };
    case "select/addSqlStep":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) => addSqlStep(transform, action.id, action.afterId),
        ),
      };
    case "select/setSql":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) => setSql(transform, action.stepId, action.sql),
        ),
      };
    case "select/removeSql":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) => removeSql(transform, action.stepId),
        ),
      };
    case "select/addFormatStep":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            addFormatStep(
              transform,
              action.section,
              action.id,
              action.fieldId,
              action.afterId,
            ),
        ),
      };
    case "select/addAsLabelStep":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            addAsLabelStep(transform, action.id, action.rowId, action.afterId),
        ),
      };
    case "select/addFormatSection":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
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
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            removeFormatSection(transform, action.stepId, action.section),
        ),
      };
    case "select/changeFormat":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            changeFormat(
              transform,
              action.stepId,
              action.format,
              action.fieldId,
            ),
        ),
      };
    case "select/changeCsv":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) => updateCsv(transform, action.stepId, action.changes),
        ),
      };
    case "select/changeProtobuf":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            updateProtobuf(transform, action.stepId, action.changes),
        ),
      };
    case "select/addProtobufFieldRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            addProtobufFieldRow(transform, action.stepId, action.id),
        ),
      };
    case "select/changeProtobufFieldRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
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
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            removeProtobufFieldRow(transform, action.stepId, action.id),
        ),
      };
    case "select/changeExport":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          "select",
          (transform) =>
            updateSelectExport(transform, action.stepId, action.changes),
        ),
      };
    case "transform/addAsLabelRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          action.kind,
          (transform) => addAsLabelRow(transform, action.stepId, action.id),
        ),
      };
    case "transform/changeAsLabelRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          action.kind,
          (transform) =>
            updateAsLabelRow(
              transform,
              action.stepId,
              action.id,
              action.changes,
            ),
        ),
      };
    case "transform/removeAsLabelRow":
      return {
        ...state,
        extBlocks: mapTransformInBlock(
          state.extBlocks,
          action.blockId,
          action.kind,
          (transform) => removeAsLabelRow(transform, action.stepId, action.id),
        ),
      };
    case "block/removeConditionBlock":
      return {
        ...state,
        conditionBlocks: state.conditionBlocks.filter(
          (block) => block.id !== action.blockId,
        ),
        blockOrder: removeBlockId(state.blockOrder, action.blockId),
      };
    case "block/removeExt":
      return {
        ...state,
        extBlocks: state.extBlocks.filter(
          (block) => block.id !== action.blockId,
        ),
        blockOrder: removeBlockId(state.blockOrder, action.blockId),
      };
    case "block/addTransform": {
      const newTransform =
        action.kind === "ros"
          ? createRosTransformStep()
          : createSelectTransformStep();
      const existing = state.extBlocks.find(
        (block) => block.id === action.blockId,
      );
      if (!existing) {
        return state;
      }
      return {
        ...state,
        extBlocks: state.extBlocks.map((block) =>
          block.id === action.blockId
            ? { ...block, transforms: [...block.transforms, newTransform] }
            : block,
        ),
      };
    }
    case "block/removeTransform":
      return {
        ...state,
        extBlocks: state.extBlocks.map((block) =>
          block.id === action.blockId
            ? {
                ...block,
                transforms: block.transforms.filter(
                  (transform) => transform.kind !== action.kind,
                ),
              }
            : block,
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
      let { conditionBlocks, steps, extBlocks } = state;
      if (previousKind === "conditions") {
        conditionBlocks = conditionBlocks.filter((block) => block.id !== id);
      } else if (previousKind === "ext") {
        extBlocks = extBlocks.filter((block) => block.id !== id);
      } else if (previousKind !== null) steps = removeStep(steps, id);

      if (kind === "conditions") {
        conditionBlocks = [
          ...conditionBlocks,
          {
            id,
            conditions: addCondition([], uuidv4()),
          },
        ];
      } else if (kind === "sample_each_n") {
        steps = addEachNStep(steps, id);
      } else if (kind === "sample_each_t") {
        steps = addEachTStep(steps, id);
      } else if (kind === "limit") {
        steps = addLimitStep(steps, id);
      } else if (kind === "ext") {
        extBlocks = [...extBlocks, { id, transforms: [] }];
      }

      return {
        ...state,
        conditionBlocks,
        steps,
        extBlocks,
        pendingStages:
          kind === null
            ? [...state.pendingStages, id]
            : state.pendingStages.filter((pid) => pid !== id),
      };
    }
    case "external/sync":
      return action.state;
    default:
      return state;
  }
}

export function initialBlockOrder(
  conditionBlocks: ConditionBlock[],
  steps: Step[],
  extBlocks: ExtBlock[],
): string[] {
  return [
    ...conditionBlocks.map((block) => block.id),
    ...steps.map((step) => step.id),
    ...extBlocks.map((block) => block.id),
  ];
}

export function conditionBlocksFromList(
  conditions: FlatCondition[],
): ConditionBlock[] {
  if (conditions.length === 0) {
    return [];
  }
  return [{ id: uuidv4(), conditions }];
}

export function extBlocksFromTransforms(
  transforms: TransformStepEntry[],
): ExtBlock[] {
  if (transforms.length === 0) {
    return [];
  }
  return [{ id: uuidv4(), transforms }];
}

interface ParsedQueryAndTransform {
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

function mergeConditionTrees(
  trees: Record<string, unknown>[],
): Record<string, unknown> {
  const nonEmpty = trees.filter((tree) => Object.keys(tree).length > 0);
  if (nonEmpty.length === 0) {
    return {};
  }
  if (nonEmpty.length === 1) {
    return nonEmpty[0];
  }
  return { $and: nonEmpty };
}

function reorderQueryKeys(
  value: Record<string, unknown>,
  blockOrder: string[],
  steps: Step[],
  conditionBlockIds: Set<string>,
  extBlockIds: Set<string>,
): Record<string, unknown> {
  const stepKeyById = new Map(
    steps.map((step) => [step.id, STEP_KEYS[step.type]]),
  );
  const conditionsKey = Object.keys(value).find(
    (key) =>
      key !== "$each_n" &&
      key !== "$each_t" &&
      key !== "$limit" &&
      key !== "#ext" &&
      key !== "$and",
  );

  const orderedKeys: string[] = [];
  let conditionsKeyAdded = false;
  let extKeyAdded = false;
  for (const blockId of blockOrder) {
    let key: string | undefined;
    if (conditionBlockIds.has(blockId)) {
      if (!conditionsKeyAdded) {
        key = conditionsKey ?? "$and";
        conditionsKeyAdded = true;
      }
    } else if (extBlockIds.has(blockId)) {
      if (!extKeyAdded) {
        key = "#ext";
        extKeyAdded = true;
      }
    } else {
      key = stepKeyById.get(blockId);
    }
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
  const conditionTrees: Record<string, unknown>[] = [];
  for (const blockId of state.blockOrder) {
    const block = state.conditionBlocks.find((entry) => entry.id === blockId);
    if (!block || !isStageEnabled(state, blockId)) {
      continue;
    }
    conditionTrees.push(serializeBuilderList(block.conditions));
  }
  const effectiveSteps = state.steps.filter((step) =>
    isStageEnabled(state, step.id),
  );
  const extPayloadParts: Record<string, unknown>[] = [];
  for (const blockId of state.blockOrder) {
    const block = state.extBlocks.find((entry) => entry.id === blockId);
    if (!block || !isStageEnabled(state, blockId)) {
      continue;
    }
    const payload = buildExtPayload(block.transforms);
    if (payload) {
      extPayloadParts.push(...payload);
    }
  }

  const merged = {
    ...mergeConditionTrees(conditionTrees),
    ...serializeSteps(effectiveSteps),
    ...(extPayloadParts.length > 0 ? { "#ext": extPayloadParts } : {}),
  };
  const ordered = reorderQueryKeys(
    merged,
    state.blockOrder,
    state.steps,
    new Set(state.conditionBlocks.map((block) => block.id)),
    new Set(state.extBlocks.map((block) => block.id)),
  );
  return formatAsStrictJSON(ordered);
}
