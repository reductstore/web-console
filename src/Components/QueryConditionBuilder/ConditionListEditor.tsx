import { Button, Select, Tooltip } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import LabelConditionEditor from "./LabelConditionEditor";
import { FlatCondition, hasValue } from "../../Helpers/conditionalQueryBuilder";

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
  const lastCondition = conditions[conditions.length - 1];
  const canAddCondition =
    sourceReady &&
    !!lastCondition &&
    lastCondition.label.trim() !== "" &&
    hasValue(lastCondition.value);
  const addConditionHint = !sourceReady
    ? "Select a bucket and entries first"
    : !canAddCondition
      ? "Fill in the label and value first"
      : "";
  const handleConnectorChange = (id: string, choice: ConnectorChoice) => {
    if (choice === "not") {
      onChangeCondition(id, { connector: "$and", negated: true });
      return;
    }
    onChangeCondition(id, { connector: choice, negated: false });
  };

  return (
    <div>
      {sourceReady &&
        conditions.map((condition, index) => (
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
                popupMatchSelectWidth={false}
                value={connectorChoiceFor(condition)}
                options={CONNECTOR_OPTIONS}
                onChange={(value) => handleConnectorChange(condition.id, value)}
                style={{ width: 70 }}
              />
            )}
            <LabelConditionEditor
              condition={condition}
              onChange={onChangeCondition}
              onRemove={onRemoveCondition}
              removable={conditions.length > 1}
              labelOptions={labelOptions}
            />
          </div>
        ))}

      <Tooltip title={addConditionHint}>
        <Button
          aria-label="Add condition"
          disabled={!canAddCondition}
          icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
          onClick={onAddCondition}
          style={{ marginTop: 8 }}
        />
      </Tooltip>
    </div>
  );
}
