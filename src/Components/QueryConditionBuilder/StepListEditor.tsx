import { Button, Dropdown, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SampleStepEditor from "./SampleStepEditor";
import LimitStepEditor from "./LimitStepEditor";
import {
  QuerySteps,
  SampleStep,
  LimitStep,
} from "../../Helpers/conditionalQueryBuilder";

interface StepListEditorProps {
  steps: QuerySteps;
  sourceReady?: boolean;
  onChangeSample: (changes: Partial<SampleStep>) => void;
  onChangeLimit: (changes: Partial<LimitStep>) => void;
  onAddSample: () => void;
  onAddLimit: () => void;
  onRemoveSample: () => void;
  onRemoveLimit: () => void;
}

export default function StepListEditor({
  steps,
  sourceReady = true,
  onChangeSample,
  onChangeLimit,
  onAddSample,
  onAddLimit,
  onRemoveSample,
  onRemoveLimit,
}: StepListEditorProps) {
  const bothAdded = !!steps.sample && !!steps.limit;
  const addStepHint = !sourceReady
    ? "Select a bucket and entries first"
    : bothAdded
      ? "Both steps are already added"
      : "";
  const disabled = !sourceReady || bothAdded;

  const menuItems = [
    !steps.sample && { key: "sample", label: "Sample" },
    !steps.limit && { key: "limit", label: "Limit" },
  ].filter((item) => item !== false);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "sample") {
      onAddSample();
    } else if (key === "limit") {
      onAddLimit();
    }
  };

  return (
    <div>
      {sourceReady && steps.sample && (
        <div style={{ marginBottom: 6 }}>
          <SampleStepEditor
            step={steps.sample}
            onChange={onChangeSample}
            onRemove={onRemoveSample}
          />
        </div>
      )}
      {sourceReady && steps.limit && (
        <div style={{ marginBottom: 6 }}>
          <LimitStepEditor
            step={steps.limit}
            onChange={onChangeLimit}
            onRemove={onRemoveLimit}
          />
        </div>
      )}

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
          >
            Add step
          </Button>
        </Dropdown>
      </Tooltip>
    </div>
  );
}
