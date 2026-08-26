import { Button, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import LabelConditionEditor from "./LabelConditionEditor";
import { FlatCondition, hasValue } from "../../Helpers/conditionalQueryBuilder";

// The dropdown shown before every condition but the first. "not" isn't a
// real connector - selecting it means "and, but negate this condition" -
// so it maps to connector "$and" with negated true, keeping NOT as a plain
// dropdown choice instead of a separate control on each row.
type ConnectorChoice = "$and" | "$or" | "not";

const CONNECTOR_OPTIONS: { value: ConnectorChoice; label: string }[] = [
  { value: "$and", label: "and" },
  { value: "$or", label: "or" },
  { value: "not", label: "not" },
];

function connectorChoiceFor(condition: FlatCondition): ConnectorChoice {
  return condition.negated ? "not" : condition.connector;
}

interface ConditionListEditorProps {
  conditions: FlatCondition[];
  onChangeCondition: (
    id: string,
    changes: Partial<
      Pick<
        FlatCondition,
        "label" | "operator" | "value" | "negated" | "connector"
      >
    >,
  ) => void;
  onRemoveCondition: (id: string) => void;
  onAddCondition: () => void;
  labelOptions?: string[];
  // False until a bucket and at least one entry are selected - nothing in
  // the list is editable before then.
  sourceReady?: boolean;
}

export default function ConditionListEditor({
  conditions,
  onChangeCondition,
  onRemoveCondition,
  onAddCondition,
  labelOptions,
  sourceReady = true,
}: ConditionListEditorProps) {
  const sourceHint = "Select a bucket and entries first";
  const lastCondition = conditions[conditions.length - 1];
  const canAddCondition =
    sourceReady &&
    !!lastCondition &&
    lastCondition.label.trim() !== "" &&
    hasValue(lastCondition.value);
  const addConditionHint = !sourceReady
    ? sourceHint
    : !canAddCondition
      ? "Fill in the label and value first"
      : undefined;
  const handleConnectorChange = (id: string, choice: ConnectorChoice) => {
    if (choice === "not") {
      onChangeCondition(id, { connector: "$and", negated: true });
      return;
    }
    onChangeCondition(id, { connector: choice, negated: false });
  };

  return (
    <div>
      {conditions.map((condition, index) => (
        <div
          key={condition.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          {index > 0 && (
            <Select
              size="small"
              popupMatchSelectWidth={false}
              value={connectorChoiceFor(condition)}
              options={CONNECTOR_OPTIONS}
              onChange={(value) => handleConnectorChange(condition.id, value)}
              style={{ width: 70 }}
              disabled={!sourceReady}
              title={!sourceReady ? sourceHint : undefined}
            />
          )}
          <LabelConditionEditor
            condition={condition}
            onChange={onChangeCondition}
            onRemove={onRemoveCondition}
            removable={conditions.length > 1}
            labelOptions={labelOptions}
            disabled={!sourceReady}
          />
        </div>
      ))}

      <Button
        aria-label="Add condition"
        title={addConditionHint}
        disabled={!canAddCondition}
        icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
        onClick={onAddCondition}
      />
    </div>
  );
}
