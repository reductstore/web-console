import { useEffect, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import ConditionListEditor from "./ConditionListEditor";
import {
  FlatCondition,
  addCondition,
  hasValue,
  parseQueryValue,
  removeCondition,
  serializeBuilderList,
  updateCondition,
} from "../../Helpers/conditionalQueryBuilder";
import { formatAsStrictJSON } from "../../Helpers/json5Utils";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof JsonQueryEditor
>["validationContext"];

interface QueryConditionBuilderProps {
  value: string;
  onChange: (value: string) => void;
  mode: "builder" | "json";
  // Called when value can't be flattened into rows (e.g. real nested
  // grouping); the parent decides how to react, typically switching to JSON.
  onUnrepresentable: () => void;
  height?: number | string;
  error?: string;
  readOnly?: boolean;
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
  readOnly = false,
  validationContext,
  onIncompleteConditionChange,
}: QueryConditionBuilderProps) {
  const [conditions, setConditions] = useState<FlatCondition[]>(() => {
    const parsed = parseQueryValue(value);
    return parsed && parsed.list.length > 0 ? parsed.list : addCondition([]);
  });

  const [eachT, setEachT] = useState<unknown>(
    () => parseQueryValue(value)?.eachT,
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
    setEachT(parsed.eachT);
  }, [value, mode]);

  useEffect(() => {
    if (mode !== "builder") {
      onIncompleteConditionChange?.(false);
      return;
    }
    const hasIncomplete = conditions.some(
      (condition) =>
        (condition.label.trim() !== "") !== hasValue(condition.value),
    );
    onIncompleteConditionChange?.(hasIncomplete);
  }, [conditions, mode]);

  const applyList = (nextConditions: FlatCondition[]) => {
    setConditions(nextConditions);
    const serialized = serializeBuilderList(nextConditions);
    const nextValue =
      eachT !== undefined ? { ...serialized, $each_t: eachT } : serialized;
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
        readOnly={readOnly}
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
          applyList(updateCondition(conditions, id, changes))
        }
        onRemoveCondition={(id) => applyList(removeCondition(conditions, id))}
        onAddCondition={() => applyList(addCondition(conditions))}
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
