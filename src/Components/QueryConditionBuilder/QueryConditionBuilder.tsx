import { useEffect, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import QueryBlockList from "./QueryBlockList";
import {
  CONDITIONS_BLOCK_ID,
  FlatCondition,
  SampleStep,
  SampleStepEntry,
  Step,
  addCondition,
  addLimitStep,
  addSampleStep,
  hasIncompleteSteps,
  hasValue,
  isDefaultSampleStep,
  moveItem,
  parseQueryValue,
  removeCondition,
  removeStep,
  serializeBuilderList,
  serializeSteps,
  updateCondition,
  updateLimitStep,
  updateSampleStep,
} from "../../Helpers/conditionalQueryBuilder";
import { formatAsStrictJSON } from "../../Helpers/json5Utils";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof JsonQueryEditor
>["validationContext"];

function splitSteps(parsed: Step[] | undefined): {
  steps: Step[];
  implicitSample: SampleStep | undefined;
} {
  const list = parsed ?? [];
  const sampleEntry = list.find(
    (step): step is SampleStepEntry => step.type === "sample",
  );
  if (sampleEntry && isDefaultSampleStep(sampleEntry.sample)) {
    return {
      steps: list.filter((step) => step.id !== sampleEntry.id),
      implicitSample: sampleEntry.sample,
    };
  }
  return { steps: list, implicitSample: undefined };
}

function initialBlockOrder(
  conditions: FlatCondition[],
  steps: Step[],
): string[] {
  return [
    ...(conditions.length > 0 ? [CONDITIONS_BLOCK_ID] : []),
    ...steps.map((step) => step.id),
  ];
}

interface QueryConditionBuilderProps {
  value: string;
  onChange: (value: string) => void;
  mode: "builder" | "json";
  // Called when value can't be flattened into rows (e.g. real nested
  // grouping); the parent decides how to react, typically switching to JSON.
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
  // Parsed once on mount and read by the four useState calls below, instead
  // of each independently re-parsing `value`.
  const [initial] = useState(() => {
    const parsed = parseQueryValue(value);
    const split = splitSteps(parsed?.steps);
    return {
      conditions: parsed?.list ?? [],
      steps: split.steps,
      implicitSample: split.implicitSample,
    };
  });

  const [conditions, setConditions] = useState<FlatCondition[]>(
    initial.conditions,
  );
  const [steps, setSteps] = useState<Step[]>(initial.steps);
  const [implicitSample, setImplicitSample] = useState<SampleStep | undefined>(
    initial.implicitSample,
  );
  // Order that "Where labels" (fixed id, present only if added) and each
  // Sample/Limit step render in - a purely visual arrangement, independent
  // of the serialized JSON (step order doesn't affect query semantics).
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
        // Label suggestions are best-effort; a failed sample query just
        // leaves the list empty.
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

  // Resync whenever we're in Builder mode and `value` doesn't match what
  // this component last emitted (a loaded query, or JSON->Builder switch).
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
    const split = splitSteps(parsed.steps);
    setSteps(split.steps);
    setImplicitSample(split.implicitSample);
    // A freshly loaded query has no prior UI arrangement to restore, so
    // "Where labels" always leads again when present.
    setBlockOrder(initialBlockOrder(parsed.list, split.steps));
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
    nextImplicitSample: SampleStep | undefined,
  ) => {
    setConditions(nextConditions);
    setSteps(nextSteps);
    setImplicitSample(nextImplicitSample);
    const hasSample = nextSteps.some((step) => step.type === "sample");
    const effectiveSteps: Step[] =
      !hasSample && nextImplicitSample
        ? [
            ...nextSteps,
            {
              id: "implicit-sample",
              type: "sample",
              sample: nextImplicitSample,
            },
          ]
        : nextSteps;
    const nextValue = {
      ...serializeBuilderList(nextConditions),
      ...serializeSteps(effectiveSteps),
    };
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
        onChangeCondition={(id, changes) =>
          applyQuery(
            updateCondition(conditions, id, changes),
            steps,
            implicitSample,
          )
        }
        onRemoveCondition={(id) =>
          applyQuery(removeCondition(conditions, id), steps, implicitSample)
        }
        onAddCondition={() =>
          applyQuery(addCondition(conditions), steps, implicitSample)
        }
        onChangeSample={(id, changes) =>
          applyQuery(
            conditions,
            updateSampleStep(steps, id, changes),
            implicitSample,
          )
        }
        onChangeLimit={(id, changes) =>
          applyQuery(
            conditions,
            updateLimitStep(steps, id, changes),
            implicitSample,
          )
        }
        onAddConditionsBlock={() => {
          applyQuery(addCondition(conditions), steps, implicitSample);
          appendBlock(CONDITIONS_BLOCK_ID);
        }}
        onRemoveConditionsBlock={() => {
          applyQuery([], steps, implicitSample);
          removeBlock(CONDITIONS_BLOCK_ID);
        }}
        onAddSample={() => {
          const nextSteps = addSampleStep(steps);
          applyQuery(conditions, nextSteps, undefined);
          appendBlock(nextSteps[nextSteps.length - 1].id);
        }}
        onAddLimit={() => {
          const nextSteps = addLimitStep(steps);
          applyQuery(conditions, nextSteps, implicitSample);
          appendBlock(nextSteps[nextSteps.length - 1].id);
        }}
        onRemoveStep={(id) => {
          const removed = steps.find((step) => step.id === id);
          applyQuery(
            conditions,
            removeStep(steps, id),
            removed?.type === "sample" ? undefined : implicitSample,
          );
          removeBlock(id);
        }}
        onReorderBlock={(fromIndex, toIndex) =>
          setBlockOrder(moveItem(blockOrder, fromIndex, toIndex))
        }
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
