import { useEffect, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import ConditionListEditor from "./ConditionListEditor";
import StepListEditor from "./StepListEditor";
import {
  FlatCondition,
  QuerySteps,
  SampleStep,
  addCondition,
  addLimitStep,
  addSampleStep,
  hasIncompleteSteps,
  hasValue,
  isDefaultSampleStep,
  parseQueryValue,
  removeCondition,
  removeLimitStep,
  removeSampleStep,
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

function splitSteps(parsed: QuerySteps | undefined): {
  steps: QuerySteps;
  implicitSample: SampleStep | undefined;
} {
  const sample = parsed?.sample;
  if (sample && isDefaultSampleStep(sample)) {
    return {
      steps: { ...parsed, sample: undefined },
      implicitSample: sample,
    };
  }
  return { steps: parsed ?? {}, implicitSample: undefined };
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
  // Parsed once on mount and read by the three useState calls below, instead
  // of each independently re-parsing `value`.
  const [initial] = useState(() => {
    const parsed = parseQueryValue(value);
    const split = splitSteps(parsed?.steps);
    return {
      conditions:
        parsed && parsed.list.length > 0 ? parsed.list : addCondition([]),
      steps: split.steps,
      implicitSample: split.implicitSample,
    };
  });

  const [conditions, setConditions] = useState<FlatCondition[]>(
    initial.conditions,
  );
  const [steps, setSteps] = useState<QuerySteps>(initial.steps);
  const [implicitSample, setImplicitSample] = useState<SampleStep | undefined>(
    initial.implicitSample,
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
    setConditions(parsed.list.length > 0 ? parsed.list : addCondition([]));
    const split = splitSteps(parsed.steps);
    setSteps(split.steps);
    setImplicitSample(split.implicitSample);
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
    nextSteps: QuerySteps,
    nextImplicitSample: SampleStep | undefined,
  ) => {
    setConditions(nextConditions);
    setSteps(nextSteps);
    setImplicitSample(nextImplicitSample);
    const effectiveSteps = {
      ...nextSteps,
      sample: nextSteps.sample ?? nextImplicitSample,
    };
    const nextValue = {
      ...serializeBuilderList(nextConditions),
      ...serializeSteps(effectiveSteps),
    };
    const formatted = formatAsStrictJSON(nextValue);
    lastEmittedValueRef.current = formatted;
    onChange(formatted);
  };

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
        Where labels
      </Typography.Text>
      <ConditionListEditor
        conditions={conditions}
        labelOptions={labelOptions}
        sourceReady={sourceReady}
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
      />
      <Typography.Text strong className="querySectionLabel">
        Steps
      </Typography.Text>
      <StepListEditor
        steps={steps}
        sourceReady={sourceReady}
        onChangeSample={(changes) =>
          applyQuery(
            conditions,
            updateSampleStep(steps, changes),
            implicitSample,
          )
        }
        onChangeLimit={(changes) =>
          applyQuery(
            conditions,
            updateLimitStep(steps, changes),
            implicitSample,
          )
        }
        onAddSample={() =>
          applyQuery(conditions, addSampleStep(steps), undefined)
        }
        onAddLimit={() =>
          applyQuery(conditions, addLimitStep(steps), implicitSample)
        }
        onRemoveSample={() =>
          applyQuery(conditions, removeSampleStep(steps), undefined)
        }
        onRemoveLimit={() =>
          applyQuery(conditions, removeLimitStep(steps), implicitSample)
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
