import { Input, Select, Button, AutoComplete } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  FlatCondition,
  LabelOperator,
} from "../../Helpers/conditionalQueryBuilder";

const OPERATOR_OPTIONS: { value: LabelOperator; label: string }[] = [
  { value: "$eq", label: "=" },
  { value: "$ne", label: "≠" },
  { value: "$gt", label: ">" },
  { value: "$gte", label: "≥" },
  { value: "$lt", label: "<" },
  { value: "$lte", label: "≤" },
  { value: "$contains", label: "contains" },
  { value: "$starts_with", label: "starts with" },
  { value: "$ends_with", label: "ends with" },
  { value: "$in", label: "in" },
  { value: "$nin", label: "not in" },
];

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

const MULTI_VALUE_OPERATORS: LabelOperator[] = ["$in", "$nin"];

export default function LabelConditionEditor({
  condition,
  onChange,
  onRemove,
  removable = true,
  labelOptions = [],
}: LabelConditionEditorProps) {
  const isMultiValue = MULTI_VALUE_OPERATORS.includes(condition.operator);

  const handleOperatorChange = (operator: LabelOperator) => {
    const wasMulti = MULTI_VALUE_OPERATORS.includes(condition.operator);
    const willBeMulti = MULTI_VALUE_OPERATORS.includes(operator);
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
        size="small"
        style={{ minWidth: 130 }}
        popupMatchSelectWidth={false}
      />
      <Select
        value={condition.operator}
        options={OPERATOR_OPTIONS}
        onChange={handleOperatorChange}
        size="small"
        style={{ minWidth: 130 }}
        popupMatchSelectWidth={false}
      />
      {isMultiValue ? (
        <Select
          mode="tags"
          placeholder="values"
          tokenSeparators={[","]}
          value={condition.value as string[]}
          onChange={(value) => onChange(condition.id, { value })}
          size="small"
          style={{ flex: 1, minWidth: 130 }}
          popupMatchSelectWidth={false}
        />
      ) : (
        <Input
          placeholder="value"
          value={condition.value as string}
          onChange={(e) => onChange(condition.id, { value: e.target.value })}
          size="small"
          style={{ flex: 1 }}
        />
      )}
      {removable && (
        <Button
          aria-label="Remove condition"
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => onRemove(condition.id)}
        />
      )}
    </div>
  );
}
