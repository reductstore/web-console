import { InputNumber, Button } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { LimitStep } from "../../Helpers/conditionalQueryBuilder";

interface LimitStepEditorProps {
  step: LimitStep;
  onChange: (changes: Partial<LimitStep>) => void;
  onRemove: () => void;
  removable?: boolean;
}

export default function LimitStepEditor({
  step,
  onChange,
  onRemove,
  removable = true,
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
        style={{ flex: 1 }}
      />
      {removable && (
        <Button
          aria-label="Remove limit step"
          type="text"
          icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
          onClick={onRemove}
        />
      )}
    </div>
  );
}
