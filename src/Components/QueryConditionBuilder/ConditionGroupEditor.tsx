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
  removable?: boolean;
  labelOptions?: string[];
}

export default function ConditionGroupEditor({
  group,
  onChangeCondition,
  onChangeGroupOperator,
  onRemoveNode,
  onAddCondition,
  onAddGroup,
  isRoot = false,
  removable = true,
  labelOptions,
}: ConditionGroupEditorProps) {
  const connectorIndex = 1;
  return (
    <div
      style={{
        border: isRoot ? "none" : "1px solid #d9d9d9",
        borderRadius: 4,
        padding: isRoot ? 0 : 28,
        position: "relative",
      }}
    >
      {!isRoot && removable && (
        <Button
          aria-label="Remove group"
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => onRemoveNode(group.id)}
          style={{ position: "absolute", top: 10, right: 10, zIndex: 1 }}
        />
      )}
      {group.children.map((child, index) => {
        const canRemoveThisChild = !(isRoot && index === 0);
        return (
          <div
            key={child.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 8,
              marginTop: child.kind === "group" ? 8 : 0,
            }}
          >
            {group.children.length > 1 && index === connectorIndex && (
              <Select
                size="small"
                popupMatchSelectWidth={false}
                value={group.operator}
                options={GROUP_OPERATOR_OPTIONS}
                onChange={(value) => onChangeGroupOperator(group.id, value)}
                style={{ width: 70 }}
              />
            )}
            {child.kind === "condition" ? (
              <LabelConditionEditor
                condition={child}
                onChange={onChangeCondition}
                onRemove={onRemoveNode}
                removable={canRemoveThisChild}
                labelOptions={labelOptions}
              />
            ) : (
              <ConditionGroupEditor
                group={child}
                onChangeCondition={onChangeCondition}
                onChangeGroupOperator={onChangeGroupOperator}
                onRemoveNode={onRemoveNode}
                onAddCondition={onAddCondition}
                onAddGroup={onAddGroup}
                removable={canRemoveThisChild}
                labelOptions={labelOptions}
              />
            )}
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
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
