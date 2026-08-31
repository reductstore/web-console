import { InputNumber } from "antd";
import { LimitStep } from "../../Helpers/conditionalQueryBuilder";

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
