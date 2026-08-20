import { Input, Select, Button, AutoComplete } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  LabelCondition,
  LabelOperator,
} from "../../Helpers/conditionalQueryBuilder";

const OPERATOR_OPTIONS: { value: LabelOperator; label: string }[] = [
  { value: "$eq", label: "$eq" },
  { value: "$ne", label: "$ne" },
  { value: "$gt", label: "$gt" },
  { value: "$gte", label: "$gte" },
  { value: "$lt", label: "$lt" },
  { value: "$lte", label: "$lte" },
  { value: "$contains", label: "$contains" },
  { value: "$starts_with", label: "$starts_with" },
  { value: "$ends_with", label: "$ends_with" },
  { value: "$in", label: "$in" },
  { value: "$nin", label: "$nin" },
];

interface LabelConditionEditorProps {
  condition: LabelCondition;
  onChange: (
    id: string,
    changes: Partial<Pick<LabelCondition, "label" | "operator" | "value">>,
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
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <AutoComplete
        placeholder="label"
        value={condition.label}
        options={labelOptions.map((option) => ({ value: option }))}
        onChange={(value) =>
          onChange(condition.id, { label: value.replace(/^&/, "") })
        }
        style={{ minWidth: 130 }}
        popupMatchSelectWidth={false}
      />
      <Select
        value={condition.operator}
        options={OPERATOR_OPTIONS}
        onChange={(value) => onChange(condition.id, { operator: value })}
        style={{ minWidth: 130 }}
        popupMatchSelectWidth={false}
      />
      <Input
        placeholder="value"
        value={condition.value as string}
        onChange={(e) => onChange(condition.id, { value: e.target.value })}
      />
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
