import {
  Dispatch,
  ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
  ComponentProps,
} from "react";
import { Button, Dropdown, Select, Tooltip, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { QueryEditor } from "../QueryEditor";
import QueryBlockList, { BuilderBlock } from "./QueryBlockList";
import BuilderErrorBoundary from "./BuilderErrorBoundary";
import ConditionListEditor from "../Stages/ConditionListEditor";
import SampleStageEditor from "../Stages/SampleStageEditor";
import LimitStageEditor from "../Stages/LimitStageEditor";
import TransformStageEditor from "../Stages/TransformStageEditor";
import SelectStageEditor from "../Stages/SelectStageEditor";
import { ROW_ICON_FONT_SIZE } from "../Stages/stageRowLayout";
import { ExtensionsDocLink } from "../Stages/StageSectionLayout";
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
  StageKind,
  builderReducer,
  initialBlockOrder,
  isStageEnabled,
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
    enabled: {},
    pendingStages: [],
    blockOrder: initialBlockOrder(conditions, steps, transforms),
  };
}

const STAGE_KIND_OPTIONS: {
  kind: StageKind;
  label: string;
  description: string;
}[] = [
  {
    kind: "conditions",
    label: "&label",
    description: "Filter records by a label's value.",
  },
  {
    kind: "ext",
    label: "#ext",
    description:
      "Process records with ReductROS and/or ReductSelect (SQL). ROS always runs first.",
  },
  {
    kind: "sample_each_n",
    label: "$each_n",
    description: "Keep only every Nth record.",
  },
  {
    kind: "sample_each_t",
    label: "$each_t",
    description: "Keep at most one record per time interval.",
  },
  {
    kind: "limit",
    label: "$limit",
    description: "Cap the number of records returned.",
  },
];

function usedStageKinds(state: BuilderState): Set<StageKind> {
  const used = new Set<StageKind>();
  if (state.blockOrder.includes(CONDITIONS_BLOCK_ID)) used.add("conditions");
  if (state.blockOrder.includes(PROCESS_BLOCK_ID)) used.add("ext");
  if (state.steps.some((step) => step.type === "each_n"))
    used.add("sample_each_n");
  if (state.steps.some((step) => step.type === "each_t"))
    used.add("sample_each_t");
  if (state.steps.some((step) => step.type === "limit")) used.add("limit");
  return used;
}

// A stage can always be reassigned to any kind that isn't already taken by
// a *different* stage - its own current kind must stay selectable so the
// dropdown still shows it as the active choice.
function disabledKindsFor(
  state: BuilderState,
  ownKind: StageKind | null,
): Set<StageKind> {
  const used = usedStageKinds(state);
  if (ownKind) used.delete(ownKind);
  return used;
}

function StageKindSelect({
  value,
  disabledKinds,
  onChange,
}: {
  value: StageKind | null;
  disabledKinds: Set<StageKind>;
  onChange: (kind: StageKind) => void;
}) {
  return (
    <Select
      aria-label="Stage type"
      placeholder="Select a stage type"
      style={{ width: 160 }}
      popupMatchSelectWidth={300}
      classNames={{ popup: { root: "stageKindDropdown" } }}
      value={value ?? undefined}
      onChange={onChange}
      options={STAGE_KIND_OPTIONS.map((option) => ({
        value: option.kind,
        label: option.label,
        disabled: disabledKinds.has(option.kind),
      }))}
      virtual={false}
      optionRender={(option) => {
        const meta = STAGE_KIND_OPTIONS.find((o) => o.kind === option.value);
        const content = (
          <div style={{ whiteSpace: "normal" }}>
            <div>{meta?.label}</div>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {meta?.description}
            </Typography.Text>
          </div>
        );
        return disabledKinds.has(option.value as StageKind) ? (
          <Tooltip title="Already used by another stage" placement="right">
            {content}
          </Tooltip>
        ) : (
          content
        );
      }}
    />
  );
}

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
  const insertHandlers = (anchorId: string) => ({
    onAddBefore: () =>
      dispatch({
        type: "stage/insert",
        id: crypto.randomUUID(),
        anchorId,
        position: "before" as const,
      }),
    onAddAfter: () =>
      dispatch({
        type: "stage/insert",
        id: crypto.randomUUID(),
        anchorId,
        position: "after" as const,
      }),
  });

  return state.blockOrder.flatMap((id): BuilderBlock[] => {
    if (state.pendingStages.includes(id)) {
      if (!sourceReady) return [];
      return [
        {
          id,
          removeLabel: "Remove stage",
          onRemove: () => dispatch({ type: "stage/removePending", id }),
          enabled: true,
          onToggleEnabled: () => {},
          ...insertHandlers(id),
          kindSelector: (
            <StageKindSelect
              value={null}
              disabledKinds={disabledKindsFor(state, null)}
              onChange={(kind) => dispatch({ type: "stage/setKind", id, kind })}
            />
          ),
          content: (
            <Typography.Text type="secondary">
              Choose a stage type above to configure it.
            </Typography.Text>
          ),
        },
      ];
    }

    if (id === CONDITIONS_BLOCK_ID) {
      if (!sourceReady) return [];
      return [
        {
          id: CONDITIONS_BLOCK_ID,
          removeLabel: "Remove label filter",
          onRemove: () => dispatch({ type: "block/removeConditions" }),
          enabled: isStageEnabled(state, CONDITIONS_BLOCK_ID),
          onToggleEnabled: () =>
            dispatch({ type: "stage/toggleEnabled", id: CONDITIONS_BLOCK_ID }),
          ...insertHandlers(CONDITIONS_BLOCK_ID),
          kindSelector: (
            <StageKindSelect
              value="conditions"
              disabledKinds={disabledKindsFor(state, "conditions")}
              onChange={(kind) =>
                dispatch({
                  type: "stage/setKind",
                  id: CONDITIONS_BLOCK_ID,
                  kind,
                })
              }
            />
          ),
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
      if (!sourceReady) return [];

      const addNestedItems = [
        { key: "ros", label: "ROS", disabled: !!rosTransform },
        { key: "select", label: "Select", disabled: !!selectTransform },
      ];
      const handleAddNested = ({ key }: { key: string }) => {
        if (key === "ros" || key === "select") {
          dispatch({ type: "block/addTransform", kind: key });
        }
      };

      return [
        {
          id: PROCESS_BLOCK_ID,
          removable: false,
          enabled: isStageEnabled(state, PROCESS_BLOCK_ID),
          onToggleEnabled: () =>
            dispatch({ type: "stage/toggleEnabled", id: PROCESS_BLOCK_ID }),
          ...insertHandlers(PROCESS_BLOCK_ID),
          kindSelector: (
            <StageKindSelect
              value="ext"
              disabledKinds={disabledKindsFor(state, "ext")}
              onChange={(kind) =>
                dispatch({ type: "stage/setKind", id: PROCESS_BLOCK_ID, kind })
              }
            />
          ),
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
                  <TransformStageEditor
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
                  <SelectStageEditor
                    step={selectTransform.select}
                    dispatch={dispatch}
                  />
                </ProcessSubsection>
              )}
              {(!rosTransform || !selectTransform) && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Dropdown
                    menu={{ items: addNestedItems, onClick: handleAddNested }}
                    trigger={["click"]}
                  >
                    <Button
                      aria-label="Add ROS or Select"
                      shape="circle"
                      size="small"
                      className="addOptionCircleButton"
                      icon={
                        <PlusOutlined
                          style={{ fontSize: ROW_ICON_FONT_SIZE }}
                        />
                      }
                    />
                  </Dropdown>
                </div>
              )}
              <ExtensionsDocLink />
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
          removeLabel: "Remove sample stage",
          onRemove: () => dispatch({ type: "step/remove", id: step.id }),
          enabled: isStageEnabled(state, step.id),
          onToggleEnabled: () =>
            dispatch({ type: "stage/toggleEnabled", id: step.id }),
          ...insertHandlers(step.id),
          kindSelector: (
            <StageKindSelect
              value={step.type === "each_n" ? "sample_each_n" : "sample_each_t"}
              disabledKinds={disabledKindsFor(
                state,
                step.type === "each_n" ? "sample_each_n" : "sample_each_t",
              )}
              onChange={(kind) =>
                dispatch({ type: "stage/setKind", id: step.id, kind })
              }
            />
          ),
          content: (
            <SampleStageEditor
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
        removeLabel: "Remove limit stage",
        onRemove: () => dispatch({ type: "step/remove", id: step.id }),
        enabled: isStageEnabled(state, step.id),
        onToggleEnabled: () =>
          dispatch({ type: "stage/toggleEnabled", id: step.id }),
        ...insertHandlers(step.id),
        kindSelector: (
          <StageKindSelect
            value="limit"
            disabledKinds={disabledKindsFor(state, "limit")}
            onChange={(kind) =>
              dispatch({ type: "stage/setKind", id: step.id, kind })
            }
          />
        ),
        content: (
          <LimitStageEditor
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

function buildAddStageButton(
  sourceReady: boolean,
  dispatch: Dispatch<BuilderAction>,
): ReactNode {
  return (
    <Button
      aria-label="Add stage"
      disabled={!sourceReady}
      icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
      onClick={() => dispatch({ type: "stage/add", id: crypto.randomUUID() })}
    >
      Add stage
    </Button>
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
      enabled: {},
      pendingStages: [],
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
          addStageMenu={buildAddStageButton(sourceReady, dispatch)}
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
