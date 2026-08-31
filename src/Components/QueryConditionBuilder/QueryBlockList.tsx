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
  EachNStep,
  EachTStep,
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
  onRemoveStep: (id: string) => void;
  onReorderBlock: (fromIndex: number, toIndex: number) => void;
}

export default function QueryBlockList({
  blockOrder,
  conditions,
  steps,
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
  onRemoveStep,
  onReorderBlock,
}: QueryBlockListProps) {
  const hasConditionsBlock = blockOrder.includes(CONDITIONS_BLOCK_ID);
  const hasEachN = steps.some((step) => step.type === "each_n");
  const hasEachT = steps.some((step) => step.type === "each_t");
  const hasLimit = steps.some((step) => step.type === "limit");
  const allAdded = hasConditionsBlock && hasEachN && hasEachT && hasLimit;
  const addStepHint = !sourceReady
    ? "Select a bucket and entries first"
    : allAdded
      ? "All steps are already added"
      : "";
  const disabled = !sourceReady || allAdded;

  const menuItems = [
    !hasConditionsBlock && { key: "conditions", label: "Where labels" },
    !hasEachT && { key: "sample_each_t", label: "Sample by time interval" },
    !hasEachN && { key: "sample_each_n", label: "Sample every N records" },
    !hasLimit && { key: "limit", label: "Limit" },
  ].filter((item) => item !== false);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "conditions") {
      onAddConditionsBlock();
    } else if (key === "sample_each_t") {
      onAddEachT();
    } else if (key === "sample_each_n") {
      onAddEachN();
    } else if (key === "limit") {
      onAddLimit();
    }
  };

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
          if (step.type === "each_n" || step.type === "each_t") {
            return (
              <SortableCard
                key={step.id}
                id={step.id}
                label={
                  step.type === "each_n"
                    ? "Sample every N records"
                    : "Sample by time interval"
                }
                removeLabel="Remove sample step"
                onRemove={() => onRemoveStep(step.id)}
                inline
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
              inline
            >
              <LimitStepEditor
                step={step.limit}
                onChange={(changes) => onChangeLimit(step.id, changes)}
              />
            </SortableCard>
          );
        }}
      />

      <Tooltip title={addStepHint}>
        {/* A disabled Button doesn't receive pointer events, so wrapping it
            directly stops the Tooltip's hover trigger from ever firing -
            this extra span still does. */}
        <span style={{ display: "inline-block", marginTop: 8 }}>
          <Dropdown
            menu={{ items: menuItems, onClick: handleMenuClick }}
            trigger={["click"]}
            disabled={disabled}
          >
            <Button
              aria-label="Add step"
              disabled={disabled}
              icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
            >
              Add step
            </Button>
          </Dropdown>
        </span>
      </Tooltip>
    </div>
  );
}
