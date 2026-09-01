import { useEffect, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import QueryBlockList from "./QueryBlockList";
import {
  CONDITIONS_BLOCK_ID,
  FlatCondition,
  Step,
  addCondition,
  addEachNStep,
  addEachTStep,
  addLimitStep,
  hasIncompleteSteps,
  hasValue,
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
} from "../../Helpers/conditionalQueryBuilder";
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
  RosExportConfig,
  RosSection,
  TransformStepEntry,
  TRANSFORM_BLOCK_ID,
  updateAsLabelRow,
  updateEncodeRow,
  updateExport,
  updateTopic,
} from "../../Helpers/transformStepBuilder";
import { formatAsStrictJSON, safeParseJSON5 } from "../../Helpers/json5Utils";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof JsonQueryEditor
>["validationContext"];

function initialBlockOrder(
  conditions: FlatCondition[],
  steps: Step[],
  transform: TransformStepEntry | undefined,
): string[] {
  return [
    ...(conditions.length > 0 ? [CONDITIONS_BLOCK_ID] : []),
    ...steps.map((step) => step.id),
    ...(transform ? [TRANSFORM_BLOCK_ID] : []),
  ];
}

interface ParsedQueryAndTransform {
  list: FlatCondition[];
  steps?: Step[];
  transform?: TransformStepEntry;
}

// Mirrors conditionalQueryBuilder's own parseQueryValue, but also splits out
// the "#ext" sibling key this file merges into the same text (see
// applyQuery) before handing the rest to the condition/step parser - kept
// here rather than in either Helper module so neither has to import the
// other.
function parseQueryAndTransform(
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
    transform: extResult.transform,
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
        : blockId === TRANSFORM_BLOCK_ID
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

interface QueryConditionBuilderProps {
  value: string;
  onChange: (value: string) => void;
  mode: "builder" | "json";
  onUnrepresentable: () => void;
  height?: number | string;
  error?: string;
  validationContext?: ValidationContext;
  onIncompleteConditionChange?: (hasIncomplete: boolean) => void;
}

export default function QueryConditionBuilder({
  value,
  onChange,
  mode,
  onUnrepresentable,
  height,
  error,
  validationContext,
  onIncompleteConditionChange,
}: QueryConditionBuilderProps) {
  const [initial] = useState(() => {
    const parsed = parseQueryAndTransform(value);
    return {
      conditions: parsed?.list ?? [],
      steps: parsed?.steps ?? [],
      transform: parsed?.transform,
    };
  });

  const [conditions, setConditions] = useState<FlatCondition[]>(
    initial.conditions,
  );
  const [steps, setSteps] = useState<Step[]>(initial.steps);

  const [transformState, setTransformState] = useState<
    TransformStepEntry | undefined
  >(initial.transform);

  const [blockOrder, setBlockOrder] = useState<string[]>(() =>
    initialBlockOrder(initial.conditions, initial.steps, initial.transform),
  );

  const lastEmittedValueRef = useRef(value);

  const [labelOptions, setLabelOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadLabelOptions() {
      if (!validationContext?.client || !validationContext?.bucket) {
        return;
      }
      const entry = validationContext.entries?.[0] ?? validationContext.entry;
      if (!entry) {
        return;
      }

      try {
        const bucketInstance = await validationContext.client.getBucket(
          validationContext.bucket,
        );
        const options = new QueryOptions();
        options.head = true;
        options.when = { $limit: 20 };

        const foundLabels = new Set<string>();
        for await (const record of bucketInstance.query(
          entry,
          undefined,
          undefined,
          options,
        )) {
          Object.keys(record.labels ?? {}).forEach((label) =>
            foundLabels.add(label),
          );
        }

        if (!cancelled) {
          setLabelOptions(Array.from(foundLabels).sort());
        }
      } catch {
        if (!cancelled) {
          setLabelOptions([]);
        }
      }
    }

    loadLabelOptions();

    return () => {
      cancelled = true;
    };
  }, [
    validationContext?.client,
    validationContext?.bucket,
    validationContext?.entry,
    validationContext?.entries,
  ]);

  useEffect(() => {
    if (mode !== "builder" || value === lastEmittedValueRef.current) {
      return;
    }
    lastEmittedValueRef.current = value;
    const parsed = parseQueryAndTransform(value);
    if (parsed === undefined) {
      onUnrepresentable();
      return;
    }
    setConditions(parsed.list);
    const nextSteps = parsed.steps ?? [];
    setSteps(nextSteps);
    setTransformState(parsed.transform);
    setBlockOrder(initialBlockOrder(parsed.list, nextSteps, parsed.transform));
  }, [value, mode]);

  useEffect(() => {
    if (mode !== "builder") {
      onIncompleteConditionChange?.(false);
      return;
    }
    const hasIncomplete =
      conditions.some(
        (condition) =>
          (condition.label.trim() !== "") !== hasValue(condition.value),
      ) ||
      hasIncompleteSteps(steps) ||
      hasIncompleteTransform(transformState);
    onIncompleteConditionChange?.(hasIncomplete);
  }, [conditions, steps, transformState, mode]);

  const applyQuery = (
    nextConditions: FlatCondition[],
    nextSteps: Step[],
    nextTransform: TransformStepEntry | undefined = transformState,
    nextBlockOrder: string[] = blockOrder,
  ) => {
    setConditions(nextConditions);
    setSteps(nextSteps);
    setTransformState(nextTransform);
    const extPayload = buildExtPayload(nextTransform);
    const merged = {
      ...serializeBuilderList(nextConditions),
      ...serializeSteps(nextSteps),
      ...(extPayload ? { "#ext": extPayload } : {}),
    };
    const nextValue = reorderQueryKeys(merged, nextBlockOrder, nextSteps);
    const formatted = formatAsStrictJSON(nextValue);
    lastEmittedValueRef.current = formatted;
    onChange(formatted);
  };

  const appendBlock = (id: string) => setBlockOrder((prev) => [...prev, id]);
  const removeBlock = (id: string) =>
    setBlockOrder((prev) => prev.filter((blockId) => blockId !== id));

  const sourceReady =
    !!validationContext?.bucket &&
    ((validationContext?.entries?.length ?? 0) > 0 ||
      !!validationContext?.entry);

  if (mode === "json") {
    return (
      <JsonQueryEditor
        value={value}
        onChange={onChange}
        height={height}
        error={error}
        validationContext={validationContext}
      />
    );
  }

  return (
    <div
      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <Typography.Text strong className="querySectionLabel">
        Query
      </Typography.Text>
      <QueryBlockList
        blockOrder={blockOrder}
        conditions={conditions}
        steps={steps}
        transform={transformState}
        sourceReady={sourceReady}
        labelOptions={labelOptions}
        intervalValue={validationContext?.intervalValue ?? undefined}
        onChangeCondition={(id, changes) =>
          applyQuery(updateCondition(conditions, id, changes), steps)
        }
        onRemoveCondition={(id) =>
          applyQuery(removeCondition(conditions, id), steps)
        }
        onAddCondition={() => applyQuery(addCondition(conditions), steps)}
        onChangeEachN={(id, changes) =>
          applyQuery(conditions, updateEachNStep(steps, id, changes))
        }
        onChangeEachT={(id, changes) =>
          applyQuery(conditions, updateEachTStep(steps, id, changes))
        }
        onChangeLimit={(id, changes) =>
          applyQuery(conditions, updateLimitStep(steps, id, changes))
        }
        onAddConditionsBlock={() => {
          applyQuery(addCondition(conditions), steps);
          appendBlock(CONDITIONS_BLOCK_ID);
        }}
        onRemoveConditionsBlock={() => {
          applyQuery([], steps);
          removeBlock(CONDITIONS_BLOCK_ID);
        }}
        onAddEachT={() => {
          const nextSteps = addEachTStep(steps);
          applyQuery(conditions, nextSteps);
          appendBlock(nextSteps[nextSteps.length - 1].id);
        }}
        onAddEachN={() => {
          const nextSteps = addEachNStep(steps);
          applyQuery(conditions, nextSteps);
          appendBlock(nextSteps[nextSteps.length - 1].id);
        }}
        onAddLimit={() => {
          const nextSteps = addLimitStep(steps);
          applyQuery(conditions, nextSteps);
          appendBlock(nextSteps[nextSteps.length - 1].id);
        }}
        onAddTransformBlock={() => {
          applyQuery(conditions, steps, createRosTransformStep());
          appendBlock(TRANSFORM_BLOCK_ID);
        }}
        onRemoveTransformBlock={() => {
          applyQuery(conditions, steps, undefined);
          removeBlock(TRANSFORM_BLOCK_ID);
        }}
        onAddSection={(section: RosSection) =>
          transformState &&
          applyQuery(conditions, steps, addSection(transformState, section))
        }
        onRemoveSection={(section: RosSection) =>
          transformState &&
          applyQuery(conditions, steps, removeSection(transformState, section))
        }
        onChangeTopic={(topic: string) =>
          transformState &&
          applyQuery(conditions, steps, updateTopic(transformState, topic))
        }
        onAddEncodeRow={() =>
          transformState &&
          applyQuery(conditions, steps, addEncodeRow(transformState))
        }
        onChangeEncodeRow={(id, changes) =>
          transformState &&
          applyQuery(
            conditions,
            steps,
            updateEncodeRow(transformState, id, changes),
          )
        }
        onRemoveEncodeRow={(id) =>
          transformState &&
          applyQuery(conditions, steps, removeEncodeRow(transformState, id))
        }
        onAddAsLabelRow={() =>
          transformState &&
          applyQuery(conditions, steps, addAsLabelRow(transformState))
        }
        onChangeAsLabelRow={(id, changes) =>
          transformState &&
          applyQuery(
            conditions,
            steps,
            updateAsLabelRow(transformState, id, changes),
          )
        }
        onRemoveAsLabelRow={(id) =>
          transformState &&
          applyQuery(conditions, steps, removeAsLabelRow(transformState, id))
        }
        onChangeExport={(changes: Partial<RosExportConfig>) =>
          transformState &&
          applyQuery(conditions, steps, updateExport(transformState, changes))
        }
        onRemoveStep={(id) => {
          applyQuery(conditions, removeStep(steps, id));
          removeBlock(id);
        }}
        onReorderBlock={(fromIndex, toIndex) => {
          const nextBlockOrder = moveItem(blockOrder, fromIndex, toIndex);
          setBlockOrder(nextBlockOrder);
          applyQuery(conditions, steps, transformState, nextBlockOrder);
        }}
      />
      {error && (
        <div className="jsonQueryEditorValidation">
          <span className="jsonQueryEditorValidationError">✗</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
