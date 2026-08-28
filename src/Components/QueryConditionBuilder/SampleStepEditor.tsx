import { Input, InputNumber, Segmented, Button, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  SampleStep,
  SampleKind,
  SAMPLE_KINDS,
} from "../../Helpers/conditionalQueryBuilder";

interface SampleStepEditorProps {
  step: SampleStep;
  onChange: (changes: Partial<SampleStep>) => void;
  onRemove: () => void;
}

export default function SampleStepEditor({
  step,
  onChange,
  onRemove,
}: SampleStepEditorProps) {
  const handleKindChange = (kind: SampleKind) => {
    onChange({
      kind,
      everyNth: undefined,
      duration: "",
      useIntervalMacro: false,
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Typography.Text style={{ width: 50, flexShrink: 0 }}>
        Sample
      </Typography.Text>
      <Segmented
        options={SAMPLE_KINDS}
        value={step.kind}
        onChange={handleKindChange}
      />
      {step.kind === "$each_n" ? (
        <InputNumber
          min={1}
          placeholder="every Nth record"
          value={step.everyNth}
          onChange={(value) => onChange({ everyNth: value ?? undefined })}
          style={{ flex: 1 }}
        />
      ) : (
        <Input
          placeholder="duration (e.g. 30s)"
          value={step.duration}
          onChange={(e) => onChange({ duration: e.target.value })}
          style={{ flex: 1 }}
        />
      )}
      <Button
        aria-label="Remove sample step"
        type="text"
        icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
        onClick={onRemove}
      />
    </div>
  );
}
