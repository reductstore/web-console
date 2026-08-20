import { Button, Select } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import LabelConditionEditor from "./LabelConditionEditor";
import {
  ConditionGroup,
  LabelCondition,
  LogicalOperator,
} from "../../Helpers/conditionalQueryBuilder";

const GROUP_OPERATOR_OPTIONS: { value: LogicalOperator; label: string }[] = [
  { value: "$and", label: "and" },
  { value: "$or", label: "or" },
  { value: "$not", label: "not" },
];

interface ConditionGroupEditorProps {
  group: ConditionGroup;
  onChangeCondition: (
    id: string,
    changes: Partial<Pick<LabelCondition, "label" | "operator" | "value">>,
  ) => void;
  onChangeGroupOperator: (groupId: string, operator: LogicalOperator) => void;
  onRemoveNode: (id: string) => void;
  onAddCondition: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  isRoot?: boolean;
}

export default function ConditionGroupEditor({
  group,
  onChangeCondition,
  onChangeGroupOperator,
  onRemoveNode,
  onAddCondition,
  onAddGroup,
  isRoot = false,
}: ConditionGroupEditorProps) {
  return (
    <div
      style={{
        border: isRoot ? "none" : "1px solid #d9d9d9",
        borderRadius: 4,
        padding: isRoot ? 0 : 8,
        position: "relative",
      }}
    >
      {!isRoot && (
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => onRemoveNode(group.id)}
          style={{ position: "absolute", top: 0, right: 0 }}
        />
      )}

      {group.children.map((child, index) => (
        <div
          key={child.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {index === 0 ? (
            <div style={{ width: 48 }} />
          ) : (
            <Select
              size="small"
              variant="borderless"
              popupMatchSelectWidth={false}
              value={group.operator}
              options={GROUP_OPERATOR_OPTIONS}
              onChange={(value) => onChangeGroupOperator(group.id, value)}
              style={{ width: 48 }}
            />
          )}
          {child.kind === "condition" ? (
            <LabelConditionEditor
              condition={child}
              onChange={onChangeCondition}
              onRemove={onRemoveNode}
            />
          ) : (
            <ConditionGroupEditor
              group={child}
              onChangeCondition={onChangeCondition}
              onChangeGroupOperator={onChangeGroupOperator}
              onRemoveNode={onRemoveNode}
              onAddCondition={onAddCondition}
              onAddGroup={onAddGroup}
            />
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 8 }}>
        <Button size="small" onClick={() => onAddCondition(group.id)}>
          + Condition
        </Button>
        <Button size="small" onClick={() => onAddGroup(group.id)}>
          + Group (and/or/not)
        </Button>
      </div>
    </div>
  );
}
