import { useState, ComponentProps, ReactNode } from "react";
import { Segmented, Typography } from "antd";
import { JsonQueryEditor } from "../JsonEditor";
import ConditionGroupEditor from "./ConditionGroupEditor";
import {
  BuilderTree,
  ConditionGroup,
  addCondition,
  addGroup,
  parseBuilderTree,
  removeNode,
  serializeBuilderTree,
  updateCondition,
  updateGroupOperator,
} from "../../Helpers/conditionalQueryBuilder";
import { formatAsStrictJSON, safeParseJSON5 } from "../../Helpers/json5Utils";

type ValidationContext = ComponentProps<
  typeof JsonQueryEditor
>["validationContext"];

interface QueryConditionBuilderProps {
  value: string;
  onChange: (value: string) => void;
  height?: number | string;
  error?: string;
  readOnly?: boolean;
  validationContext?: ValidationContext;
  onSave?: () => void;
  saveDisabled?: boolean;
  toolbarExtra?: ReactNode;
}

function jsonTextToTree(text: string): BuilderTree | undefined {
  const parsed = safeParseJSON5(text);
  if (!parsed.success) {
    return undefined;
  }
  const result = parseBuilderTree(parsed.value);
  return result.success ? (result.tree ?? null) : undefined;
}

const EMPTY_ROOT: ConditionGroup = {
  kind: "group",
  id: "empty-root",
  operator: "$and",
  children: [],
};

export default function QueryConditionBuilder({
  value,
  onChange,
  height,
  error,
  readOnly = false,
  validationContext,
  onSave,
  saveDisabled,
  toolbarExtra,
}: QueryConditionBuilderProps) {
  const [mode, setMode] = useState<"builder" | "json">("builder");
  const [tree, setTree] = useState<BuilderTree>(
    () => jsonTextToTree(value) ?? null,
  );
  const canSwitchToBuilder = jsonTextToTree(value) !== undefined;

  const applyTree = (nextTree: BuilderTree) => {
    setTree(nextTree);
    onChange(formatAsStrictJSON(serializeBuilderTree(nextTree)));
  };

  const handleModeChange = (nextMode: "builder" | "json") => {
    if (nextMode === "builder") {
      const parsedTree = jsonTextToTree(value);
      if (parsedTree === undefined) {
        return;
      }
      setTree(parsedTree);
    }
    setMode(nextMode);
  };

  const modeSwitch = (
    <Segmented
      value={mode}
      onChange={(v) => handleModeChange(v as "builder" | "json")}
      options={[
        {
          label: "Builder",
          value: "builder",
          disabled: mode === "json" && !canSwitchToBuilder,
        },
        { label: "JSON", value: "json" },
      ]}
    />
  );

  if (mode === "json") {
    return (
      <div>
        {modeSwitch}
        <JsonQueryEditor
          value={value}
          onChange={onChange}
          height={height}
          error={error}
          readOnly={readOnly}
          validationContext={validationContext}
          onSave={onSave}
          saveDisabled={saveDisabled}
          toolbarExtra={toolbarExtra}
        />
      </div>
    );
  }

  return (
    <div
      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}
    >
      {modeSwitch}
      <div className="querySection">
        <Typography.Text strong className="querySectionLabel">
          Where labels
        </Typography.Text>
        <ConditionGroupEditor
          group={tree ?? EMPTY_ROOT}
          isRoot
          onChangeCondition={(id, changes) =>
            applyTree(updateCondition(tree, id, changes))
          }
          onChangeGroupOperator={(groupId, operator) =>
            applyTree(updateGroupOperator(tree, groupId, operator))
          }
          onRemoveNode={(id) => applyTree(removeNode(tree, id))}
          onAddCondition={(groupId) => applyTree(addCondition(tree, groupId))}
          onAddGroup={(groupId) => applyTree(addGroup(tree, groupId))}
        />
      </div>
    </div>
  );
}
