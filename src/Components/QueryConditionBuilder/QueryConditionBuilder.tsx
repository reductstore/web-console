import { useEffect, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import ConditionListEditor from "./ConditionListEditor";
import {
  FlatCondition,
  addCondition,
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
  // Called whenever `value` can't be represented as a block chain while
  // `mode` is (or becomes) "builder" - e.g. real nested grouping. The parent
  // owns `mode`, so it decides what to do (typically switch to JSON mode).
  onUnrepresentable: () => void;
  height?: number | string;
  error?: string;
  readOnly?: boolean;
  validationContext?: ValidationContext;
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
}: QueryConditionBuilderProps) {
  const [conditions, setConditions] = useState<FlatCondition[]>(() => {
    const parsed = parseQueryValue(value);
    return parsed && parsed.list.length > 0 ? parsed.list : addCondition([]);
  });
  // The value of a top-level $each_t directive (a sampling macro outside the
  // builder's scope, see #232), carried through re-serializations instead of
  // being silently dropped the next time a condition is edited.
  const [eachT, setEachT] = useState<unknown>(
    () => parseQueryValue(value)?.eachT,
  );
  // The most recent `value` this component itself produced via onChange, so
  // an external change to `value` (e.g. loading a saved query, or the parent
  // switching back from JSON mode) can be told apart from an update this
  // component made to its own props.
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
        // Label suggestions are a convenience; a failed sample query (bucket
        // unreachable, permission error, etc.) just leaves the list empty
        // instead of surfacing an error for a non-essential feature.
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

  // Resync conditions/eachT whenever we're in Builder mode and `value`
  // doesn't match what this component last emitted itself - covers both an
  // external change (e.g. loading a saved query) and the parent switching
  // from JSON back to Builder mode.
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

  const applyList = (nextConditions: FlatCondition[]) => {
    setConditions(nextConditions);
    const serialized = serializeBuilderList(nextConditions);
    const nextValue =
      eachT !== undefined ? { ...serialized, $each_t: eachT } : serialized;
    const formatted = formatAsStrictJSON(nextValue);
    lastEmittedValueRef.current = formatted;
    onChange(formatted);
  };

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
        onChangeCondition={(id, changes) =>
          applyList(updateCondition(conditions, id, changes))
        }
        onRemoveCondition={(id) => applyList(removeCondition(conditions, id))}
        onAddCondition={() => applyList(addCondition(conditions))}
      />
    </div>
  );
}
