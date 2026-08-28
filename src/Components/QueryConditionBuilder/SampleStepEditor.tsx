import { Input, InputNumber, Segmented, Tooltip } from "antd";
import {
  EachNStep,
  EachTStep,
  SampleKind,
  SAMPLE_KINDS,
  isValidEachTDuration,
} from "../../Helpers/conditionalQueryBuilder";

interface SampleStepEditorProps {
  kind: SampleKind;
  everyNth?: number;
  duration: string;
  useIntervalMacro: boolean;
  onChangeEachN: (changes: Partial<EachNStep>) => void;
  onChangeEachT: (changes: Partial<EachTStep>) => void;
  onSwitchKind: (kind: SampleKind) => void;
  // True once both kinds are already in use by sibling Sample steps -
  // switching would collide with the other one, so the picker locks.
  switchDisabled?: boolean;
  intervalValue?: string;
}

export default function SampleStepEditor({
  kind,
  everyNth,
  duration,
  useIntervalMacro,
  onChangeEachN,
  onChangeEachT,
  onSwitchKind,
  switchDisabled = false,
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
      <Segmented
        options={SAMPLE_KINDS}
        value={kind}
        onChange={onSwitchKind}
        disabled={switchDisabled}
      />
      {kind === "each_n" ? (
        <InputNumber
          min={1}
          placeholder="every Nth record"
          value={everyNth}
          onChange={(value) => onChangeEachN({ everyNth: value ?? undefined })}
          style={{ width: 140 }}
        />
      ) : (
        <Tooltip
          title={
            !useIntervalMacro &&
            duration.trim() !== "" &&
            !isValidEachTDuration(duration)
              ? "Expected a duration like 30s, 1m, 1h, 1d, or a combination like 1d 2h"
              : ""
          }
        >
          <Input
            placeholder="duration (e.g. 30s)"
            value={useIntervalMacro ? intervalValue : duration}
            onChange={(e) =>
              onChangeEachT({
                duration: e.target.value,
                useIntervalMacro: false,
              })
            }
            status={
              !useIntervalMacro &&
              duration.trim() !== "" &&
              !isValidEachTDuration(duration)
                ? "error"
                : undefined
            }
            style={{ width: 140 }}
          />
        </Tooltip>
      )}
    </div>
  );
}
