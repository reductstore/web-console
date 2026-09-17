import { InputNumber } from "antd";
import { LimitStep } from "../../Helpers/conditionalQueryBuilder";
import { VALUE_INPUT_WIDTH } from "./stageRowLayout";
import { SingleRowStageContent } from "./StageSectionLayout";

interface LimitStageEditorProps {
  step: LimitStep;
  onChange: (changes: Partial<LimitStep>) => void;
}

export default function LimitStageEditor({
  step,
  onChange,
}: LimitStageEditorProps) {
  return (
    <SingleRowStageContent label="Count">
      <InputNumber
        min={1}
        placeholder="max records"
        value={step.count}
        onChange={(value) => onChange({ count: value ?? undefined })}
        style={{ width: VALUE_INPUT_WIDTH }}
      />
    </SingleRowStageContent>
  );
}
