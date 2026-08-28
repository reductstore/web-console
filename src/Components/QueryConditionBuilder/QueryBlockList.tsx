import { Button, Dropdown, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import ConditionListEditor from "./ConditionListEditor";
import SampleStepEditor from "./SampleStepEditor";
import LimitStepEditor from "./LimitStepEditor";
import SortableCard from "./SortableCard";
import SortableList from "./SortableList";
import {
  CONDITIONS_BLOCK_ID,
  FlatCondition,
  Step,
  SampleStep,
  LimitStep,
} from "../../Helpers/conditionalQueryBuilder";

type Block =
  | { id: typeof CONDITIONS_BLOCK_ID; kind: "conditions" }
  | { id: string; kind: "step"; step: Step };

interface QueryBlockListProps {
  blockOrder: string[];
  conditions: FlatCondition[];
  steps: Step[];
  sourceReady?: boolean;
  labelOptions?: string[];
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
  onChangeSample: (id: string, changes: Partial<SampleStep>) => void;
  onChangeLimit: (id: string, changes: Partial<LimitStep>) => void;
  onAddSample: () => void;
  onAddLimit: () => void;
  onAddConditionsBlock: () => void;
  onRemoveConditionsBlock: () => void;
  onRemoveStep: (id: string) => void;
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
}

export default function QueryBlockList({
  blockOrder,
  conditions,
  steps,
  sourceReady = true,
  labelOptions,
  onChangeCondition,
  onRemoveCondition,
  onAddCondition,
  onChangeSample,
  onChangeLimit,
  onAddSample,
  onAddLimit,
  onAddConditionsBlock,
  onRemoveConditionsBlock,
  onRemoveStep,
  onReorderBlock,
}: QueryBlockListProps) {
  const hasConditionsBlock = blockOrder.includes(CONDITIONS_BLOCK_ID);
  const hasSample = steps.some((step) => step.type === "sample");
  const hasLimit = steps.some((step) => step.type === "limit");
  const allAdded = hasConditionsBlock && hasSample && hasLimit;
  const addStepHint = !sourceReady
    ? "Select a bucket and entries first"
    : allAdded
      ? "All steps are already added"
      : "";
  const disabled = !sourceReady || allAdded;

  const menuItems = [
    !hasConditionsBlock && { key: "conditions", label: "Where labels" },
    !hasSample && { key: "sample", label: "Sample" },
    !hasLimit && { key: "limit", label: "Limit" },
  ].filter((item) => item !== false);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "conditions") {
      onAddConditionsBlock();
    } else if (key === "sample") {
      onAddSample();
    } else if (key === "limit") {
      onAddLimit();
    }
  };

  // Every block - conditions included - only exists once a bucket and
  // entries are selected, and only if the user has actually added it.
  const blocks: Block[] = sourceReady
    ? blockOrder.flatMap((id): Block[] => {
        if (id === CONDITIONS_BLOCK_ID) {
          return [{ id: CONDITIONS_BLOCK_ID, kind: "conditions" }];
        }
        const step = steps.find((s) => s.id === id);
        return step ? [{ id, kind: "step", step }] : [];
      })
    : [];

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
                label="Where labels"
                removeLabel="Remove where labels"
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
          const { step } = block;
          return step.type === "sample" ? (
            <SortableCard
              key={step.id}
              id={step.id}
              label="Sample"
              removeLabel="Remove sample step"
              onRemove={() => onRemoveStep(step.id)}
              inline
            >
              <SampleStepEditor
                step={step.sample}
                onChange={(changes) => onChangeSample(step.id, changes)}
                onRemove={() => onRemoveStep(step.id)}
                removable={false}
              />
            </SortableCard>
          ) : (
            <SortableCard
              key={step.id}
              id={step.id}
              label="Limit"
              removeLabel="Remove limit step"
              onRemove={() => onRemoveStep(step.id)}
              inline
            >
              <LimitStepEditor
                step={step.limit}
                onChange={(changes) => onChangeLimit(step.id, changes)}
                onRemove={() => onRemoveStep(step.id)}
                removable={false}
              />
            </SortableCard>
          );
        }}
      />

      <Tooltip title={addStepHint}>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
          disabled={disabled}
        >
          <Button
            aria-label="Add step"
            disabled={disabled}
            icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
            style={{ marginTop: 8 }}
          >
            Add step
          </Button>
        </Dropdown>
      </Tooltip>
    </div>
  );
}
