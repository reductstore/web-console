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
import { PlusOutlined } from "@ant-design/icons";
import { QueryEditor } from "../QueryEditor";
import QueryBlockList, { BuilderBlock } from "./QueryBlockList";
import BuilderErrorBoundary from "./BuilderErrorBoundary";
import ConditionListEditor from "../Stages/ConditionListEditor";
import SampleStageEditor from "../Stages/SampleStageEditor";
import LimitStageEditor from "../Stages/LimitStageEditor";
import TransformStageEditor, {
  TransformStageAddButton,
} from "../Stages/TransformStageEditor";
import SelectStageEditor, {
  SelectStageAddButton,
} from "../Stages/SelectStageEditor";
import { ROW_ICON_FONT_SIZE, ROW_LABEL_WIDTH } from "../Stages/stageRowLayout";
import {
  ExtensionsDocLink,
  ExtensionsLicenseNotice,
} from "../Stages/StageSectionLayout";
import {
  hasIncompleteSteps,
  hasValue,
} from "../../Helpers/conditionalQueryBuilder";
import { hasIncompleteTransform } from "../../Helpers/transformStepBuilder";
import {
  BuilderAction,
  BuilderState,
  StageKind,
  builderReducer,
  conditionBlocksFromList,
  extBlocksFromTransforms,
  initialBlockOrder,
  isStageEnabled,
  parseQueryAndTransform,
  serialize,
} from "../../Helpers/builderReducer";
import { conditionBlockDispatch } from "../../Helpers/conditionBlockDispatch";
import { extBlockDispatch } from "../../Helpers/extBlockDispatch";
import { SELECT_SOURCE_HINT } from "../../Helpers/builderHints";
import { checkLicenseStatus } from "../../Helpers/licenseUtils";
import { QueryOptions } from "reduct-js";

type ValidationContext = ComponentProps<
  typeof QueryEditor
>["validationContext"];

function buildInitialState(value: string): BuilderState {
  const parsed = parseQueryAndTransform(value);
  const conditionBlocks = conditionBlocksFromList(parsed?.list ?? []);
  const steps = parsed?.steps ?? [];
  const extBlocks = extBlocksFromTransforms(parsed?.transforms ?? []);
  return {
    conditionBlocks,
    steps,
    extBlocks,
    enabled: {},
    pendingStages: [],
    blockOrder: initialBlockOrder(conditionBlocks, steps, extBlocks),
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

function usedSingletonKinds(state: BuilderState): Set<StageKind> {
  const used = new Set<StageKind>();
  for (const step of state.steps) {
    if (step.type === "each_n") used.add("sample_each_n");
    if (step.type === "each_t") used.add("sample_each_t");
    if (step.type === "limit") used.add("limit");
  }
  return used;
}

function disabledKindsFor(
  state: BuilderState,
  ownKind: StageKind | null,
): Set<StageKind> {
  const used = usedSingletonKinds(state);
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
  titleExtra,
  divider = false,
  children,
}: {
  title: string;
  titleExtra?: ReactNode;
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
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Typography.Text strong style={{ minWidth: ROW_LABEL_WIDTH }}>
          {title}
        </Typography.Text>
        {titleExtra}
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
  hasProLicense: boolean,
  dispatch: Dispatch<BuilderAction>,
): BuilderBlock[] {
  // The default $each_t sample stage renders even before a bucket/entry is
  // selected (see below), so its insert-stage buttons are always wired up
  // too - QueryBlockList keeps them visible but disabled while !sourceReady
  // (so the layout stays static instead of buttons popping in and out), and
  // this guard is belt-and-suspenders: never dispatch a stage/insert while
  // no bucket/entry is selected, even if a disabled button is somehow
  // triggered.
  const insertHandlers = (anchorId: string) => ({
    onAddBefore: () => {
      if (!sourceReady) return;
      dispatch({
        type: "stage/insert",
        id: crypto.randomUUID(),
        anchorId,
        position: "before" as const,
      });
    },
    onAddAfter: () => {
      if (!sourceReady) return;
      dispatch({
        type: "stage/insert",
        id: crypto.randomUUID(),
        anchorId,
        position: "after" as const,
      });
    },
  });

  return state.blockOrder.flatMap((id): BuilderBlock[] => {
    if (state.pendingStages.includes(id)) {
      if (!sourceReady) return [];
      return [
        {
          id,
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

    const conditionBlock = state.conditionBlocks.find(
      (block) => block.id === id,
    );
    if (conditionBlock) {
      if (!sourceReady) return [];
      const blockDispatch = conditionBlockDispatch(id, dispatch);
      return [
        {
          id,
          onRemove: () =>
            dispatch({ type: "block/removeConditionBlock", blockId: id }),
          enabled: isStageEnabled(state, id),
          onToggleEnabled: () => dispatch({ type: "stage/toggleEnabled", id }),
          ...insertHandlers(id),
          kindSelector: (
            <StageKindSelect
              value="conditions"
              disabledKinds={disabledKindsFor(state, "conditions")}
              onChange={(kind) =>
                dispatch({
                  type: "stage/setKind",
                  id,
                  kind,
                })
              }
            />
          ),
          content: (
            <ConditionListEditor
              conditions={conditionBlock.conditions}
              labelOptions={labelOptions}
              sourceReady={sourceReady}
              onChangeCondition={(conditionId, changes) =>
                blockDispatch({
                  type: "condition/change",
                  id: conditionId,
                  changes,
                })
              }
              onRemoveCondition={(conditionId) =>
                blockDispatch({ type: "condition/remove", id: conditionId })
              }
              onAddCondition={() =>
                blockDispatch({
                  type: "condition/add",
                  id: crypto.randomUUID(),
                })
              }
            />
          ),
        },
      ];
    }

    const extBlock = state.extBlocks.find((block) => block.id === id);
    if (extBlock) {
      const rosTransform = extBlock.transforms.find((t) => t.kind === "ros");
      const selectTransform = extBlock.transforms.find(
        (t) => t.kind === "select",
      );
      if (!sourceReady) return [];

      const blockDispatch = extBlockDispatch(id, dispatch);

      const addNestedItems = [
        {
          key: "ros",
          disabled: !!rosTransform,
          label: rosTransform ? (
            <Tooltip title="ROS is already added" placement="right">
              <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>ROS</span>
            </Tooltip>
          ) : (
            "ROS"
          ),
        },
        {
          key: "select",
          disabled: !!selectTransform,
          label: selectTransform ? (
            <Tooltip title="Select is already added" placement="right">
              <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>Select</span>
            </Tooltip>
          ) : (
            "Select"
          ),
        },
      ];
      const handleAddNested = ({ key }: { key: string }) => {
        if (key === "ros" || key === "select") {
          dispatch({ type: "block/addTransform", blockId: id, kind: key });
        }
      };

      return [
        {
          id,
          onRemove: () => dispatch({ type: "block/removeExt", blockId: id }),
          enabled: isStageEnabled(state, id),
          onToggleEnabled: () => dispatch({ type: "stage/toggleEnabled", id }),
          headerExtra: hasProLicense ? undefined : <ExtensionsLicenseNotice />,
          ...insertHandlers(id),
          extraMenuItems: [
            ...(rosTransform
              ? [
                  {
                    key: "removeRos",
                    label: "Remove ROS",
                    onClick: () =>
                      dispatch({
                        type: "block/removeTransform",
                        blockId: id,
                        kind: "ros",
                      }),
                  },
                ]
              : []),
            ...(selectTransform
              ? [
                  {
                    key: "removeSelect",
                    label: "Remove Select",
                    onClick: () =>
                      dispatch({
                        type: "block/removeTransform",
                        blockId: id,
                        kind: "select",
                      }),
                  },
                ]
              : []),
          ],
          kindSelector: (
            <StageKindSelect
              value="ext"
              disabledKinds={disabledKindsFor(state, "ext")}
              onChange={(kind) => dispatch({ type: "stage/setKind", id, kind })}
            />
          ),
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {rosTransform && (
                <ProcessSubsection
                  title="ROS"
                  titleExtra={
                    <TransformStageAddButton
                      step={rosTransform.ros}
                      dispatch={blockDispatch}
                    />
                  }
                >
                  <TransformStageEditor
                    step={rosTransform.ros}
                    dispatch={blockDispatch}
                  />
                </ProcessSubsection>
              )}
              {selectTransform && (
                <ProcessSubsection
                  title="Select"
                  divider={!!rosTransform}
                  titleExtra={
                    <SelectStageAddButton
                      step={selectTransform.select}
                      dispatch={blockDispatch}
                    />
                  }
                >
                  <SelectStageEditor
                    step={selectTransform.select}
                    dispatch={blockDispatch}
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
                      icon={
                        <PlusOutlined
                          style={{ fontSize: ROW_ICON_FONT_SIZE }}
                        />
                      }
                    >
                      Add extension
                    </Button>
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
    <Tooltip title={sourceReady ? "" : SELECT_SOURCE_HINT}>
      {/* A disabled Button doesn't receive pointer events, so wrapping it
          directly stops the Tooltip's hover trigger from ever firing -
          this extra span still does. */}
      <span>
        <Button
          aria-label="Add stage"
          disabled={!sourceReady}
          icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
          onClick={() => {
            // Belt-and-suspenders: `disabled` already blocks native clicks,
            // but never dispatch a stage/add while no bucket/entry is
            // selected.
            if (!sourceReady) return;
            dispatch({ type: "stage/add", id: crypto.randomUUID() });
          }}
        >
          Add stage
        </Button>
      </span>
    </Tooltip>
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

  const sourceReady =
    !!validationContext?.bucket &&
    ((validationContext?.entries?.length ?? 0) > 0 ||
      !!validationContext?.entry);

  // Losing the bucket/entry selection should feel like starting over, not
  // like everything's still there but hidden: stages added while a source
  // was picked shouldn't silently reappear if a (possibly different) source
  // is picked again later. Only resets on an actual ready -> not-ready
  // transition, and only in builder mode (switching bucket/entry while
  // looking at raw JSON shouldn't blow away what's being typed there).
  const wasSourceReadyRef = useRef(sourceReady);
  useEffect(() => {
    if (mode === "builder" && wasSourceReadyRef.current && !sourceReady) {
      dispatch({ type: "builder/resetToDefault" });
    }
    wasSourceReadyRef.current = sourceReady;
  }, [sourceReady, mode]);

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

  // Assume a valid license until proven otherwise, so a Pro user briefly
  // sees nothing instead of a flash of a warning that doesn't apply to them.
  const [hasProLicense, setHasProLicense] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLicenseStatus() {
      if (!validationContext?.client) {
        return;
      }
      try {
        const info = await validationContext.client.getInfo();
        if (!cancelled) {
          setHasProLicense(
            checkLicenseStatus(info.license, info.usage).isValid,
          );
        }
      } catch {
        // Can't confirm one way or the other - leave the last known state.
      }
    }

    loadLicenseStatus();

    return () => {
      cancelled = true;
    };
  }, [validationContext?.client]);

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
    const nextConditionBlocks = conditionBlocksFromList(parsed.list);
    const nextExtBlocks = extBlocksFromTransforms(parsed.transforms ?? []);
    const nextState: BuilderState = {
      conditionBlocks: nextConditionBlocks,
      steps: nextSteps,
      extBlocks: nextExtBlocks,
      enabled: {},
      pendingStages: [],
      blockOrder: initialBlockOrder(
        nextConditionBlocks,
        nextSteps,
        nextExtBlocks,
      ),
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
      state.conditionBlocks.some((block) =>
        block.conditions.some(
          (condition) =>
            (condition.label.trim() !== "") !== hasValue(condition.value),
        ),
      ) ||
      hasIncompleteSteps(state.steps) ||
      state.extBlocks.some((block) => hasIncompleteTransform(block.transforms));
    onIncompleteConditionChange?.(hasIncomplete);
  }, [state.conditionBlocks, state.steps, state.extBlocks, mode]);

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
            hasProLicense,
            dispatch,
          )}
          sourceReady={sourceReady}
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
