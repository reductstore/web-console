import { Button, Dropdown, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ConditionListEditor from "./ConditionListEditor";
import SampleStepEditor from "./SampleStepEditor";
import LimitStepEditor from "./LimitStepEditor";
import TransformStepEditor from "./TransformStepEditor";
import SelectStepEditor from "./SelectStepEditor";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";
import {
  CONDITIONS_BLOCK_ID,
  FlatCondition,
  Step,
  EachNStep,
  EachTStep,
  LimitStep,
} from "../../Helpers/conditionalQueryBuilder";
import {
  CsvConfig,
  KeyValueRow,
  ProtobufConfig,
  ProtobufFieldRow,
  RosExportConfig,
  RosSection,
  SelectExportConfig,
  SelectFormatSection,
  SelectInputFormat,
  TransformKind,
  TransformStepEntry,
  TRANSFORM_BLOCK_ID,
} from "../../Helpers/transformStepBuilder";

type Block =
  | { id: typeof CONDITIONS_BLOCK_ID; kind: "conditions" }
  | {
      id: typeof TRANSFORM_BLOCK_ID;
      kind: "transform";
      transform: TransformStepEntry;
    }
  | { id: string; kind: "step"; step: Step };

interface QueryBlockListProps {
  blockOrder: string[];
  conditions: FlatCondition[];
  steps: Step[];
  transform?: TransformStepEntry;
  sourceReady?: boolean;
  labelOptions?: string[];
  intervalValue?: string;
  onChangeCondition: (
    id: string,
    changes: Partial<
      Pick<
        FlatCondition,
        "label" | "operator" | "value" | "negated" | "connector"
      >
    >,
  ) => void;
  onRemoveCondition: (id: string) => void;
  onAddCondition: () => void;

  onChangeEachN: (id: string, changes: Partial<EachNStep>) => void;
  onChangeEachT: (id: string, changes: Partial<EachTStep>) => void;
  onChangeLimit: (id: string, changes: Partial<LimitStep>) => void;
  onAddEachT: () => void;
  onAddEachN: () => void;
  onAddLimit: () => void;
  onAddConditionsBlock: () => void;
  onRemoveConditionsBlock: () => void;
  onAddTransformBlock: (kind: TransformKind) => void;
  onRemoveTransformBlock: () => void;
  onAddSection: (section: RosSection) => void;
  onRemoveSection: (section: RosSection) => void;
  onChangeTopic: (topic: string) => void;
  onAddEncodeRow: () => void;
  onChangeEncodeRow: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemoveEncodeRow: (id: string) => void;
  onAddAsLabelRow: () => void;
  onChangeAsLabelRow: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemoveAsLabelRow: (id: string) => void;
  onChangeExport: (changes: Partial<RosExportConfig>) => void;
  onChangeSql: (sql: string) => void;
  onAddFormatSection: (section: SelectFormatSection) => void;
  onRemoveFormatSection: (section: SelectFormatSection) => void;
  onChangeFormat: (format: SelectInputFormat) => void;
  onChangeCsv: (changes: Partial<CsvConfig>) => void;
  onChangeProtobuf: (
    changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>,
  ) => void;
  onAddProtobufFieldRow: () => void;
  onChangeProtobufFieldRow: (
    id: string,
    changes: Partial<
      Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
    >,
  ) => void;
  onRemoveProtobufFieldRow: (id: string) => void;
  onChangeSelectExport: (changes: Partial<SelectExportConfig>) => void;
  onRemoveStep: (id: string) => void;
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
}

export default function QueryBlockList({
  blockOrder,
  conditions,
  steps,
  transform,
  sourceReady = true,
  labelOptions,
  intervalValue,
  onChangeCondition,
  onRemoveCondition,
  onAddCondition,
  onChangeEachN,
  onChangeEachT,
  onChangeLimit,
  onAddEachT,
  onAddEachN,
  onAddLimit,
  onAddConditionsBlock,
  onRemoveConditionsBlock,
  onAddTransformBlock,
  onRemoveTransformBlock,
  onAddSection,
  onRemoveSection,
  onChangeTopic,
  onAddEncodeRow,
  onChangeEncodeRow,
  onRemoveEncodeRow,
  onAddAsLabelRow,
  onChangeAsLabelRow,
  onRemoveAsLabelRow,
  onChangeExport,
  onChangeSql,
  onAddFormatSection,
  onRemoveFormatSection,
  onChangeFormat,
  onChangeCsv,
  onChangeProtobuf,
  onAddProtobufFieldRow,
  onChangeProtobufFieldRow,
  onRemoveProtobufFieldRow,
  onChangeSelectExport,
  onRemoveStep,
  onReorderBlock,
}: QueryBlockListProps) {
  const hasConditionsBlock = blockOrder.includes(CONDITIONS_BLOCK_ID);
  const hasEachN = steps.some((step) => step.type === "each_n");
  const hasEachT = steps.some((step) => step.type === "each_t");
  const hasLimit = steps.some((step) => step.type === "limit");
  const hasTransform = !!transform;

  const STEP_LABELS: Record<string, string> = {
    conditions: "Label filter",
    sample_each_t: "Sample by time",
    sample_each_n: "Sample every N",
    limit: "Limit",
    transform_ros: "Process (ROS)",
    transform_select: "Process (Select)",
  };

  const disabledStepReason = (key: string): string | undefined => {
    if (!sourceReady) return "Select a bucket and entries first";
    if (key === "conditions" && hasConditionsBlock)
      return "Label filter is already added";
    if (key === "sample_each_t" && hasEachT)
      return "Sample by time is already added";
    if (key === "sample_each_n" && hasEachN)
      return "Sample every N is already added";
    if (key === "limit" && hasLimit) return "Limit is already added";
    if (key === "transform_ros" && hasTransform) {
      return transform?.kind === "ros"
        ? "Process (ROS) is already added"
        : "Not available together with Process (Select)";
    }
    if (key === "transform_select" && hasTransform) {
      return transform?.kind === "select"
        ? "Process (Select) is already added"
        : "Not available together with Process (ROS)";
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
      onAddConditionsBlock();
    } else if (key === "sample_each_t") {
      onAddEachT();
    } else if (key === "sample_each_n") {
      onAddEachN();
    } else if (key === "limit") {
      onAddLimit();
    } else if (key === "transform_ros") {
      onAddTransformBlock("ros");
    } else if (key === "transform_select") {
      onAddTransformBlock("select");
    }
  };

  const blocks: Block[] = blockOrder.flatMap((id): Block[] => {
    if (id === CONDITIONS_BLOCK_ID) {
      return sourceReady
        ? [{ id: CONDITIONS_BLOCK_ID, kind: "conditions" }]
        : [];
    }
    if (id === TRANSFORM_BLOCK_ID) {
      return sourceReady && transform
        ? [{ id: TRANSFORM_BLOCK_ID, kind: "transform", transform }]
        : [];
    }
    const step = steps.find((s) => s.id === id);
    if (!step) return [];
    // The each_t/interval step is the app's built-in default (present even
    // before a bucket/entry is picked), so it stays visible regardless of
    // sourceReady - every other step is only ever added once a source is
    // selected, so those still wait on it.
    if (step.type === "each_t" || sourceReady) {
      return [{ id, kind: "step", step }];
    }
    return [];
  });

  return (
    <div>
      <SortableList
        items={blocks}
        onReorder={onReorderBlock}
        renderItem={(block) => {
          if (block.kind === "conditions") {
            return (
              <SortableCard
                key={CONDITIONS_BLOCK_ID}
                id={CONDITIONS_BLOCK_ID}
                label="Label filter"
                removeLabel="Remove label filter"
                onRemove={onRemoveConditionsBlock}
              >
                <ConditionListEditor
                  conditions={conditions}
                  labelOptions={labelOptions}
                  sourceReady={sourceReady}
                  onChangeCondition={onChangeCondition}
                  onRemoveCondition={onRemoveCondition}
                  onAddCondition={onAddCondition}
                />
              </SortableCard>
            );
          }
          if (block.kind === "transform") {
            if (block.transform.kind === "select") {
              return (
                <SortableCard
                  key={TRANSFORM_BLOCK_ID}
                  id={TRANSFORM_BLOCK_ID}
                  label="Process (Select)"
                  removeLabel="Remove select"
                  onRemove={onRemoveTransformBlock}
                >
                  <SelectStepEditor
                    step={block.transform.select}
                    onChangeSql={onChangeSql}
                    onAddFormatSection={onAddFormatSection}
                    onRemoveFormatSection={onRemoveFormatSection}
                    onChangeFormat={onChangeFormat}
                    onChangeCsv={onChangeCsv}
                    onChangeProtobuf={onChangeProtobuf}
                    onAddProtobufFieldRow={onAddProtobufFieldRow}
                    onChangeProtobufFieldRow={onChangeProtobufFieldRow}
                    onRemoveProtobufFieldRow={onRemoveProtobufFieldRow}
                    onChangeSelectExport={onChangeSelectExport}
                    onAddAsLabelRow={onAddAsLabelRow}
                    onChangeAsLabelRow={onChangeAsLabelRow}
                    onRemoveAsLabelRow={onRemoveAsLabelRow}
                  />
                </SortableCard>
              );
            }
            return (
              <SortableCard
                key={TRANSFORM_BLOCK_ID}
                id={TRANSFORM_BLOCK_ID}
                label="Process (ROS)"
                removeLabel="Remove process"
                onRemove={onRemoveTransformBlock}
              >
                <TransformStepEditor
                  step={block.transform.ros}
                  onAddSection={onAddSection}
                  onRemoveSection={onRemoveSection}
                  onChangeTopic={onChangeTopic}
                  onAddEncodeRow={onAddEncodeRow}
                  onChangeEncodeRow={onChangeEncodeRow}
                  onRemoveEncodeRow={onRemoveEncodeRow}
                  onAddAsLabelRow={onAddAsLabelRow}
                  onChangeAsLabelRow={onChangeAsLabelRow}
                  onRemoveAsLabelRow={onRemoveAsLabelRow}
                  onChangeExport={onChangeExport}
                />
              </SortableCard>
            );
          }
          const { step } = block;
          if (step.type === "each_n" || step.type === "each_t") {
            return (
              <SortableCard
                key={step.id}
                id={step.id}
                label={
                  step.type === "each_n" ? "Sample every N" : "Sample by time"
                }
                removeLabel="Remove sample step"
                onRemove={() => onRemoveStep(step.id)}
              >
                <SampleStepEditor
                  kind={step.type}
                  everyNth={
                    step.type === "each_n" ? step.eachN.everyNth : undefined
                  }
                  duration={step.type === "each_t" ? step.eachT.duration : ""}
                  useIntervalMacro={
                    step.type === "each_t" ? step.eachT.useIntervalMacro : false
                  }
                  onChangeEachN={(changes) => onChangeEachN(step.id, changes)}
                  onChangeEachT={(changes) => onChangeEachT(step.id, changes)}
                  intervalValue={intervalValue}
                />
              </SortableCard>
            );
          }
          return (
            <SortableCard
              key={step.id}
              id={step.id}
              label="Limit"
              removeLabel="Remove limit step"
              onRemove={() => onRemoveStep(step.id)}
            >
              <LimitStepEditor
                step={step.limit}
                onChange={(changes) => onChangeLimit(step.id, changes)}
              />
            </SortableCard>
          );
        }}
      />

      <span style={{ display: "inline-block", marginTop: 8 }}>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
        >
          <Button
            aria-label="Add step"
            icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
          >
            Add step
          </Button>
        </Dropdown>
      </span>
    </div>
  );
}
