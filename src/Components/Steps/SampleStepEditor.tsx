import { AutoComplete, InputNumber, Typography } from "antd";
import {
  EachNStep,
  EachTStep,
  SampleKind,
} from "../../Helpers/conditionalQueryBuilder";
import { ROW_LABEL_WIDTH, VALUE_INPUT_WIDTH } from "./stepRowLayout";

const DURATION_SUGGESTIONS = [
  "$__interval",
  "1s",
  "2s",
  "5s",
  "10s",
  "30s",
  "1m",
  "5m",
  "10m",
  "30m",
  "1h",
].map((value) => ({ value }));

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
      <Typography.Text
        strong
        style={{ width: ROW_LABEL_WIDTH, flexShrink: 0, fontSize: 12 }}
      >
        {kind === "each_n" ? "Step" : "Interval"}
      </Typography.Text>
      {kind === "each_n" ? (
        <InputNumber
          min={1}
          placeholder="every Nth record"
          value={everyNth}
          onChange={(value) => onChangeEachN({ everyNth: value ?? undefined })}
          style={{ width: VALUE_INPUT_WIDTH / 2 }}
        />
      ) : (
        <AutoComplete
          aria-label="Interval"
          options={DURATION_SUGGESTIONS}
          value={useIntervalMacro ? "$__interval" : duration}
          onChange={(value) =>
            value === "$__interval"
              ? onChangeEachT({ useIntervalMacro: true })
              : onChangeEachT({ duration: value, useIntervalMacro: false })
          }
          placeholder="30s, 1m"
          style={{ width: VALUE_INPUT_WIDTH }}
          popupMatchSelectWidth={false}
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
