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
  parseQueryValue,
  removeCondition,
  removeStep,
  serializeBuilderList,
  serializeSteps,
  updateCondition,
  updateEachNStep,
  updateEachTStep,
  updateLimitStep,
} from "../../Helpers/conditionalQueryBuilder";
import { formatAsStrictJSON } from "../../Helpers/json5Utils";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof JsonQueryEditor
>["validationContext"];

function initialBlockOrder(
  conditions: FlatCondition[],
  steps: Step[],
): string[] {
  return [
    ...(conditions.length > 0 ? [CONDITIONS_BLOCK_ID] : []),
    ...steps.map((step) => step.id),
  ];
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
    (key) => key !== "$each_n" && key !== "$each_t" && key !== "$limit",
  );

  const orderedKeys: string[] = [];
  for (const blockId of blockOrder) {
    const key =
      blockId === CONDITIONS_BLOCK_ID
        ? conditionsKey
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
    const parsed = parseQueryValue(value);
    return {
      conditions: parsed?.list ?? [],
      steps: parsed?.steps ?? [],
    };
  });

  const [conditions, setConditions] = useState<FlatCondition[]>(
    initial.conditions,
  );
  const [steps, setSteps] = useState<Step[]>(initial.steps);

  const [blockOrder, setBlockOrder] = useState<string[]>(() =>
    initialBlockOrder(initial.conditions, initial.steps),
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
    const parsed = parseQueryValue(value);
    if (parsed === undefined) {
      onUnrepresentable();
      return;
    }
    setConditions(parsed.list);
    const nextSteps = parsed.steps ?? [];
    setSteps(nextSteps);
    setBlockOrder(initialBlockOrder(parsed.list, nextSteps));
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
      ) || hasIncompleteSteps(steps);
    onIncompleteConditionChange?.(hasIncomplete);
  }, [conditions, steps, mode]);

  const applyQuery = (
    nextConditions: FlatCondition[],
    nextSteps: Step[],
    nextBlockOrder: string[] = blockOrder,
  ) => {
    setConditions(nextConditions);
    setSteps(nextSteps);
    const merged = {
      ...serializeBuilderList(nextConditions),
      ...serializeSteps(nextSteps),
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
        onRemoveStep={(id) => {
          applyQuery(conditions, removeStep(steps, id));
          removeBlock(id);
        }}
        onReorderBlock={(fromIndex, toIndex) => {
          const nextBlockOrder = moveItem(blockOrder, fromIndex, toIndex);
          setBlockOrder(nextBlockOrder);
          applyQuery(conditions, steps, nextBlockOrder);
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
