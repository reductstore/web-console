import {
  Dispatch,
  ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
  ComponentProps,
} from "react";
import { Button, Dropdown, Tooltip, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { QueryEditor } from "../QueryEditor";
import QueryBlockList, { BuilderBlock } from "./QueryBlockList";
import BuilderErrorBoundary from "./BuilderErrorBoundary";
import ConditionListEditor from "../Steps/ConditionListEditor";
import SampleStepEditor from "../Steps/SampleStepEditor";
import LimitStepEditor from "../Steps/LimitStepEditor";
import TransformStepEditor from "../Steps/TransformStepEditor";
import SelectStepEditor from "../Steps/SelectStepEditor";
import { ROW_ICON_FONT_SIZE } from "../Steps/stepRowLayout";
import {
  CONDITIONS_BLOCK_ID,
  hasIncompleteSteps,
  hasValue,
} from "../../Helpers/conditionalQueryBuilder";
import {
  PROCESS_BLOCK_ID,
  hasIncompleteTransform,
} from "../../Helpers/transformStepBuilder";
import {
  BuilderAction,
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

const STEP_LABELS: Record<string, string> = {
  conditions: "Label filter",
  sample_each_t: "Sample by time",
  sample_each_n: "Sample every N",
  limit: "Limit",
  transform_ros: "Process (ROS)",
  transform_select: "Process (Select)",
};

function ProcessSubsection({
  title,
  removeLabel,
  onRemove,
  divider = false,
  children,
}: {
  title: string;
  removeLabel: string;
  onRemove: () => void;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={
        divider ? { borderTop: "1px solid #f0f0f0", paddingTop: 16 } : undefined
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>{title}</Typography.Text>
        <Button
          aria-label={removeLabel}
          type="text"
          icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
          onClick={onRemove}
        />
      </div>
      {children}
    </div>
  );
}

function buildBlocks(
  state: BuilderState,
  sourceReady: boolean,
  labelOptions: string[] | undefined,
  intervalValue: string | undefined,
  dispatch: Dispatch<BuilderAction>,
): BuilderBlock[] {
  return state.blockOrder.flatMap((id): BuilderBlock[] => {
    if (id === CONDITIONS_BLOCK_ID) {
      if (!sourceReady) return [];
      return [
        {
          id: CONDITIONS_BLOCK_ID,
          label: STEP_LABELS.conditions,
          removeLabel: "Remove label filter",
          onRemove: () => dispatch({ type: "block/removeConditions" }),
          content: (
            <ConditionListEditor
              conditions={state.conditions}
              labelOptions={labelOptions}
              sourceReady={sourceReady}
              onChangeCondition={(conditionId, changes) =>
                dispatch({ type: "condition/change", id: conditionId, changes })
              }
              onRemoveCondition={(conditionId) =>
                dispatch({ type: "condition/remove", id: conditionId })
              }
              onAddCondition={() =>
                dispatch({ type: "condition/add", id: crypto.randomUUID() })
              }
            />
          ),
        },
      ];
    }

    if (id === PROCESS_BLOCK_ID) {
      const rosTransform = state.transforms.find((t) => t.kind === "ros");
      const selectTransform = state.transforms.find((t) => t.kind === "select");
      if (!sourceReady || (!rosTransform && !selectTransform)) return [];
      return [
        {
          id: PROCESS_BLOCK_ID,
          label: "Process",
          removable: false,
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rosTransform && (
                <ProcessSubsection
                  title="ROS"
                  removeLabel="Remove ROS processing"
                  onRemove={() =>
                    dispatch({ type: "block/removeTransform", kind: "ros" })
                  }
                >
                  <TransformStepEditor
                    step={rosTransform.ros}
                    dispatch={dispatch}
                  />
                </ProcessSubsection>
              )}
              {selectTransform && (
                <ProcessSubsection
                  title="Select"
                  removeLabel="Remove Select processing"
                  divider={!!rosTransform}
                  onRemove={() =>
                    dispatch({ type: "block/removeTransform", kind: "select" })
                  }
                >
                  <SelectStepEditor
                    step={selectTransform.select}
                    dispatch={dispatch}
                  />
                </ProcessSubsection>
              )}
            </div>
          ),
        },
      ];
    }

    const step = state.steps.find((s) => s.id === id);
    if (!step) return [];
    if (step.type !== "each_t" && !sourceReady) return [];

    if (step.type === "each_n" || step.type === "each_t") {
      return [
        {
          id: step.id,
          label:
            step.type === "each_n"
              ? STEP_LABELS.sample_each_n
              : STEP_LABELS.sample_each_t,
          removeLabel: "Remove sample step",
          onRemove: () => dispatch({ type: "step/remove", id: step.id }),
          content: (
            <SampleStepEditor
              kind={step.type}
              everyNth={
                step.type === "each_n" ? step.eachN.everyNth : undefined
              }
              duration={step.type === "each_t" ? step.eachT.duration : ""}
              useIntervalMacro={
                step.type === "each_t" ? step.eachT.useIntervalMacro : false
              }
              onChangeEachN={(changes) =>
                dispatch({ type: "step/changeEachN", id: step.id, changes })
              }
              onChangeEachT={(changes) =>
                dispatch({ type: "step/changeEachT", id: step.id, changes })
              }
              intervalValue={intervalValue}
            />
          ),
        },
      ];
    }

    return [
      {
        id: step.id,
        label: STEP_LABELS.limit,
        removeLabel: "Remove limit step",
        onRemove: () => dispatch({ type: "step/remove", id: step.id }),
        content: (
          <LimitStepEditor
            step={step.limit}
            onChange={(changes) =>
              dispatch({ type: "step/changeLimit", id: step.id, changes })
            }
          />
        ),
      },
    ];
  });
}

function buildAddStepMenu(
  state: BuilderState,
  sourceReady: boolean,
  dispatch: Dispatch<BuilderAction>,
): ReactNode {
  const hasConditionsBlock = state.blockOrder.includes(CONDITIONS_BLOCK_ID);
  const hasEachN = state.steps.some((step) => step.type === "each_n");
  const hasEachT = state.steps.some((step) => step.type === "each_t");
  const hasLimit = state.steps.some((step) => step.type === "limit");
  const hasRos = state.transforms.some((transform) => transform.kind === "ros");
  const hasSelect = state.transforms.some(
    (transform) => transform.kind === "select",
  );

  const disabledStepReason = (key: string): string | undefined => {
    if (!sourceReady) return "Select a bucket and entries first";
    if (key === "conditions" && hasConditionsBlock)
      return "Label filter is already added";
    if (key === "sample_each_t" && hasEachT)
      return "Sample by time is already added";
    if (key === "sample_each_n" && hasEachN)
      return "Sample every N is already added";
    if (key === "limit" && hasLimit) return "Limit is already added";
    if (key === "transform_ros" && hasRos) {
      return "Process (ROS) is already added";
    }
    if (key === "transform_select" && hasSelect) {
      return "Process (Select) is already added";
    }
    return undefined;
  };

  const menuItems = Object.keys(STEP_LABELS).map((key) => {
    const reason = disabledStepReason(key);
    return {
      key,
      disabled: !!reason,
      label: reason ? (
        <Tooltip title={reason} placement="right">
          <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
            {STEP_LABELS[key]}
          </span>
        </Tooltip>
      ) : (
        STEP_LABELS[key]
      ),
    };
  });

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "conditions") {
      dispatch({ type: "block/addConditions", id: crypto.randomUUID() });
    } else if (key === "sample_each_t") {
      dispatch({ type: "block/addEachT", id: crypto.randomUUID() });
    } else if (key === "sample_each_n") {
      dispatch({ type: "block/addEachN", id: crypto.randomUUID() });
    } else if (key === "limit") {
      dispatch({ type: "block/addLimit", id: crypto.randomUUID() });
    } else if (key === "transform_ros") {
      dispatch({ type: "block/addTransform", kind: "ros" });
    } else if (key === "transform_select") {
      dispatch({ type: "block/addTransform", kind: "select" });
    }
  };

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleMenuClick }}
      trigger={["click"]}
    >
      <Button
        aria-label="Add step"
        icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
      >
        Add step
      </Button>
    </Dropdown>
  );
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
          blocks={buildBlocks(
            state,
            sourceReady,
            labelOptions,
            validationContext?.intervalValue ?? undefined,
            dispatch,
          )}
          onReorderBlock={(fromIndex, toIndex) =>
            dispatch({ type: "block/reorder", fromIndex, toIndex })
          }
          addStepMenu={buildAddStepMenu(state, sourceReady, dispatch)}
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
