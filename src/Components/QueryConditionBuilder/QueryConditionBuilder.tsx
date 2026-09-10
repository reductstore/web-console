import { useEffect, useReducer, useRef, useState, ComponentProps } from "react";
import { Typography } from "antd";
import { QueryEditor } from "../QueryEditor";
import QueryBlockList from "./QueryBlockList";
import BuilderErrorBoundary from "./BuilderErrorBoundary";
import {
  hasIncompleteSteps,
  hasValue,
} from "../../Helpers/conditionalQueryBuilder";
import { hasIncompleteTransform } from "../../Helpers/transformStepBuilder";
import {
  BuilderState,
  builderReducer,
  initialBlockOrder,
  parseQueryAndTransform,
  serialize,
} from "../../Helpers/builderReducer";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof QueryEditor
>["validationContext"];

function buildInitialState(value: string): BuilderState {
  const parsed = parseQueryAndTransform(value);
  const conditions = parsed?.list ?? [];
  const steps = parsed?.steps ?? [];
  const transforms = parsed?.transforms ?? [];
  return {
    conditions,
    steps,
    transforms,
    blockOrder: initialBlockOrder(conditions, steps, transforms),
  };
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
  const [state, dispatch] = useReducer(
    builderReducer,
    value,
    buildInitialState,
  );
  const lastEmittedValueRef = useRef(value);
  const skipNextNotifyRef = useRef(true);

  useEffect(() => {
    if (skipNextNotifyRef.current) {
      skipNextNotifyRef.current = false;
      return;
    }
    const formatted = serialize(state);
    lastEmittedValueRef.current = formatted;
    onChange(formatted);
  }, [state]);

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
    const nextSteps = parsed.steps ?? [];
    const nextTransforms = parsed.transforms ?? [];
    const nextState: BuilderState = {
      conditions: parsed.list,
      steps: nextSteps,
      transforms: nextTransforms,
      blockOrder: initialBlockOrder(parsed.list, nextSteps, nextTransforms),
    };
    skipNextNotifyRef.current = true;
    dispatch({ type: "external/sync", state: nextState });
  }, [value, mode]);

  useEffect(() => {
    if (mode !== "builder") {
      onIncompleteConditionChange?.(false);
      return;
    }
    const hasIncomplete =
      state.conditions.some(
        (condition) =>
          (condition.label.trim() !== "") !== hasValue(condition.value),
      ) ||
      hasIncompleteSteps(state.steps) ||
      hasIncompleteTransform(state.transforms);
    onIncompleteConditionChange?.(hasIncomplete);
  }, [state.conditions, state.steps, state.transforms, mode]);

  const sourceReady =
    !!validationContext?.bucket &&
    ((validationContext?.entries?.length ?? 0) > 0 ||
      !!validationContext?.entry);

  if (mode === "json") {
    return (
      <QueryEditor
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
      <BuilderErrorBoundary>
        <QueryBlockList
          blockOrder={state.blockOrder}
          conditions={state.conditions}
          steps={state.steps}
          transforms={state.transforms}
          sourceReady={sourceReady}
          labelOptions={labelOptions}
          intervalValue={validationContext?.intervalValue ?? undefined}
          onChangeCondition={(id, changes) =>
            dispatch({ type: "condition/change", id, changes })
          }
          onRemoveCondition={(id) => dispatch({ type: "condition/remove", id })}
          onAddCondition={() => dispatch({ type: "condition/add" })}
          onChangeEachN={(id, changes) =>
            dispatch({ type: "step/changeEachN", id, changes })
          }
          onChangeEachT={(id, changes) =>
            dispatch({ type: "step/changeEachT", id, changes })
          }
          onChangeLimit={(id, changes) =>
            dispatch({ type: "step/changeLimit", id, changes })
          }
          onAddConditionsBlock={() => dispatch({ type: "block/addConditions" })}
          onRemoveConditionsBlock={() =>
            dispatch({ type: "block/removeConditions" })
          }
          onAddEachT={() => dispatch({ type: "block/addEachT" })}
          onAddEachN={() => dispatch({ type: "block/addEachN" })}
          onAddLimit={() => dispatch({ type: "block/addLimit" })}
          onAddTransformBlock={(kind) =>
            dispatch({ type: "block/addTransform", kind })
          }
          onRemoveTransformBlock={(kind) =>
            dispatch({ type: "block/removeTransform", kind })
          }
          onAddSection={(section) =>
            dispatch({ type: "ros/addSection", section })
          }
          onRemoveSection={(section) =>
            dispatch({ type: "ros/removeSection", section })
          }
          onChangeTopic={(topic) =>
            dispatch({ type: "ros/changeTopic", topic })
          }
          onAddEncodeRow={() => dispatch({ type: "ros/addEncodeRow" })}
          onChangeEncodeRow={(id, changes) =>
            dispatch({ type: "ros/changeEncodeRow", id, changes })
          }
          onRemoveEncodeRow={(id) =>
            dispatch({ type: "ros/removeEncodeRow", id })
          }
          onAddRosAsLabelRow={() => dispatch({ type: "ros/addAsLabelRow" })}
          onChangeRosAsLabelRow={(id, changes) =>
            dispatch({ type: "ros/changeAsLabelRow", id, changes })
          }
          onRemoveRosAsLabelRow={(id) =>
            dispatch({ type: "ros/removeAsLabelRow", id })
          }
          onChangeExport={(changes) =>
            dispatch({ type: "ros/changeExport", changes })
          }
          onChangeSql={(sql) => dispatch({ type: "select/changeSql", sql })}
          onAddFormatSection={(section) =>
            dispatch({ type: "select/addFormatSection", section })
          }
          onRemoveFormatSection={(section) =>
            dispatch({ type: "select/removeFormatSection", section })
          }
          onChangeFormat={(format) =>
            dispatch({ type: "select/changeFormat", format })
          }
          onChangeCsv={(changes) =>
            dispatch({ type: "select/changeCsv", changes })
          }
          onChangeProtobuf={(changes) =>
            dispatch({ type: "select/changeProtobuf", changes })
          }
          onAddProtobufFieldRow={() =>
            dispatch({ type: "select/addProtobufFieldRow" })
          }
          onChangeProtobufFieldRow={(id, changes) =>
            dispatch({ type: "select/changeProtobufFieldRow", id, changes })
          }
          onRemoveProtobufFieldRow={(id) =>
            dispatch({ type: "select/removeProtobufFieldRow", id })
          }
          onChangeSelectExport={(changes) =>
            dispatch({ type: "select/changeExport", changes })
          }
          onAddSelectAsLabelRow={() =>
            dispatch({ type: "select/addAsLabelRow" })
          }
          onChangeSelectAsLabelRow={(id, changes) =>
            dispatch({ type: "select/changeAsLabelRow", id, changes })
          }
          onRemoveSelectAsLabelRow={(id) =>
            dispatch({ type: "select/removeAsLabelRow", id })
          }
          onRemoveStep={(id) => dispatch({ type: "step/remove", id })}
          onReorderBlock={(fromIndex, toIndex) =>
            dispatch({ type: "block/reorder", fromIndex, toIndex })
          }
        />
      </BuilderErrorBoundary>
      {error && (
        <div className="jsonQueryEditorValidation">
          <span className="jsonQueryEditorValidationError">✗</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
