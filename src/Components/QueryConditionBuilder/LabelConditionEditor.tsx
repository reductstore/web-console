import { Input, Select, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  LabelCondition,
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
  condition: LabelCondition;
  onChange: (
    id: string,
    changes: Partial<Pick<LabelCondition, "label" | "operator" | "value">>,
  ) => void;
  onRemove: (id: string) => void;
}

export default function LabelConditionEditor({
  condition,
  onChange,
  onRemove,
}: LabelConditionEditorProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input
        placeholder="label"
        value={condition.label}
        onChange={(e) => onChange(condition.id, { label: e.target.value })}
      />
      <Select
        value={condition.operator}
        options={OPERATOR_OPTIONS}
        onChange={(value) => onChange(condition.id, { operator: value })}
      />
      <Input
        placeholder="value"
        value={condition.value as string}
        onChange={(e) => onChange(condition.id, { value: e.target.value })}
      />
      <Button
        icon={<DeleteOutlined />}
        onClick={() => onRemove(condition.id)}
      />
    </div>
  );
}
