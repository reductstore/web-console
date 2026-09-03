import { InputNumber, Typography } from "antd";
import { LimitStep } from "../../Helpers/conditionalQueryBuilder";
import { ROW_LABEL_WIDTH } from "./stepRowLayout";

interface LimitStepEditorProps {
  step: LimitStep;
  onChange: (changes: Partial<LimitStep>) => void;
}

export default function LimitStepEditor({
  step,
  onChange,
}: LimitStepEditorProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography.Text
        strong
        style={{ width: ROW_LABEL_WIDTH, flexShrink: 0, fontSize: 12 }}
      >
        Count
      </Typography.Text>
      <InputNumber
        min={1}
        placeholder="max records"
        value={step.count}
        onChange={(value) => onChange({ count: value ?? undefined })}
        style={{ width: 140 }}
      />
    </div>
  );
}
