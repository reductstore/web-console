import { InputNumber, Button, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { LimitStep } from "../../Helpers/conditionalQueryBuilder";

interface LimitStepEditorProps {
  step: LimitStep;
  onChange: (changes: Partial<LimitStep>) => void;
  onRemove: () => void;
}

export default function LimitStepEditor({
  step,
  onChange,
  onRemove,
}: LimitStepEditorProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Typography.Text style={{ width: 50, flexShrink: 0 }}>
        Limit
      </Typography.Text>
      <InputNumber
        min={1}
        placeholder="max records"
        value={step.count}
        onChange={(value) => onChange({ count: value ?? undefined })}
        style={{ flex: 1 }}
      />
      <Button
        aria-label="Remove limit step"
        type="text"
        icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
        onClick={onRemove}
      />
    </div>
  );
}
