import { Input, Select, Button, AutoComplete } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  FlatCondition,
  LabelOperator,
  LABEL_OPERATORS,
  isMultiValueOperator,
} from "../../Helpers/conditionalQueryBuilder";

interface LabelConditionEditorProps {
  condition: FlatCondition;
  onChange: (
    id: string,
    changes: Partial<Pick<FlatCondition, "label" | "operator" | "value">>,
  ) => void;
  onRemove: (id: string) => void;
  removable?: boolean;
  labelOptions?: string[];
}

export default function LabelConditionEditor({
  condition,
  onChange,
  onRemove,
  removable = true,
  labelOptions = [],
}: LabelConditionEditorProps) {
  const isMultiValue = isMultiValueOperator(condition.operator);

  const handleOperatorChange = (operator: LabelOperator) => {
    const wasMulti = isMultiValueOperator(condition.operator);
    const willBeMulti = isMultiValueOperator(operator);
    if (willBeMulti === wasMulti) {
      onChange(condition.id, { operator });
      return;
    }
    if (willBeMulti) {
      const value = condition.value as string;
      onChange(condition.id, { operator, value: value ? [value] : [] });
      return;
    }
    const [value] = condition.value as string[];
    onChange(condition.id, { operator, value: value ?? "" });
  };

  return (
    <div style={{ display: "flex", gap: 8, flex: 1 }}>
      <AutoComplete
        placeholder="label"
        value={condition.label}
        options={labelOptions.map((option) => ({ value: option }))}
        onChange={(value) =>
          onChange(condition.id, { label: value.replace(/^&/, "") })
        }
        style={{ minWidth: 130, flexShrink: 0 }}
        popupMatchSelectWidth={false}
      />
      <Select
        value={condition.operator}
        options={LABEL_OPERATORS}
        onChange={handleOperatorChange}
        style={{ width: "max-content", minWidth: 48, flexShrink: 0 }}
        popupMatchSelectWidth={false}
      />
      {isMultiValue ? (
        <Select
          mode="tags"
          placeholder="values"
          tokenSeparators={[","]}
          value={condition.value as string[]}
          onChange={(value) => onChange(condition.id, { value })}
          style={{ flex: 1, minWidth: 130 }}
          popupMatchSelectWidth={false}
        />
      ) : (
        <Input
          placeholder="value"
          value={condition.value as string}
          onChange={(e) => onChange(condition.id, { value: e.target.value })}
          style={{ flex: 1 }}
        />
      )}
      {removable && (
        <Button
          aria-label="Remove condition"
          type="text"
          icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
          onClick={() => onRemove(condition.id)}
        />
      )}
    </div>
  );
}
