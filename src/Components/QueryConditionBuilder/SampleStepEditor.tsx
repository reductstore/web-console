import { Input, InputNumber, Typography } from "antd";
import {
  EachNStep,
  EachTStep,
  SampleKind,
} from "../../Helpers/conditionalQueryBuilder";

interface SampleStepEditorProps {
  kind: SampleKind;
  everyNth?: number;
  duration: string;
  useIntervalMacro: boolean;
  onChangeEachN: (changes: Partial<EachNStep>) => void;
  onChangeEachT: (changes: Partial<EachTStep>) => void;
  intervalValue?: string;
}

export default function SampleStepEditor({
  kind,
  everyNth,
  duration,
  useIntervalMacro,
  onChangeEachN,
  onChangeEachT,
  intervalValue,
}: SampleStepEditorProps) {
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
      {kind === "each_n" ? (
        <InputNumber
          min={1}
          placeholder="every Nth record"
          value={everyNth}
          onChange={(value) => onChangeEachN({ everyNth: value ?? undefined })}
          style={{ width: 140 }}
        />
      ) : (
        <Input
          placeholder="30s, 1m"
          value={useIntervalMacro ? "$__interval" : duration}
          onChange={(e) =>
            onChangeEachT({
              duration: e.target.value,
              useIntervalMacro: false,
            })
          }
          style={{ width: 140 }}
        />
      )}
      {kind === "each_t" && useIntervalMacro && intervalValue && (
        <Typography.Text type="secondary">
          resolves to {intervalValue}
        </Typography.Text>
      )}
    </div>
  );
}
