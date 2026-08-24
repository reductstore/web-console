import { useEffect, useState, ComponentProps, ReactNode } from "react";
import { Button, Switch, Tooltip, Typography } from "antd";
import { SaveOutlined } from "@ant-design/icons";
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
import { QueryOptions } from "reduct-js";

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
    () => jsonTextToTree(value) ?? addCondition(null, null),
  );
  // Snapshot of `value` taken when switching into JSON mode. Returning to
  // Builder mode reparses losslessly only if `value` still matches it; any
  // change (typed, formatted, or loaded from a saved query) instead resets
  // the builder entirely rather than attempting a partial reparse.
  const [jsonEntrySnapshot, setJsonEntrySnapshot] = useState<string | null>(
    null,
  );

  const [labelOptions, setLabelOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadLabelOptions() {
      if (!validationContext?.client || !validationContext?.bucket) {
        return;
      }
      const entry = validationContext.entries?.[0] ?? validationContext.entry;
      if (!entry) {
        return;
      }

      try {
        const bucketInstance = await validationContext.client.getBucket(
          validationContext.bucket,
        );
        const options = new QueryOptions();
        options.head = true;
        options.when = { $limit: 20 };

        const foundLabels = new Set<string>();
        for await (const record of bucketInstance.query(
          entry,
          undefined,
          undefined,
          options,
        )) {
          Object.keys(record.labels ?? {}).forEach((label) =>
            foundLabels.add(label),
          );
        }

        if (!cancelled) {
          setLabelOptions(Array.from(foundLabels).sort());
        }
      } catch {
        // Label suggestions are a convenience; a failed sample query (bucket
        // unreachable, permission error, etc.) just leaves the list empty
        // instead of surfacing an error for a non-essential feature.
      }
    }

    loadLabelOptions();

    return () => {
      cancelled = true;
    };
  }, [
    validationContext?.client,
    validationContext?.bucket,
    validationContext?.entry,
    validationContext?.entries,
  ]);

  const applyTree = (nextTree: BuilderTree) => {
    setTree(nextTree);
    onChange(formatAsStrictJSON(serializeBuilderTree(nextTree)));
  };

  const handleModeChange = (nextMode: "builder" | "json") => {
    if (nextMode === "json") {
      setJsonEntrySnapshot(value);
      setMode("json");
      return;
    }
    if (value !== jsonEntrySnapshot) {
      applyTree(addCondition(null, null));
    }
    setMode("builder");
  };

  const modeSwitch = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Typography.Text>JSON</Typography.Text>
      <Switch
        checked={mode === "json"}
        onChange={(checked) => handleModeChange(checked ? "json" : "builder")}
      />
    </div>
  );

  const saveButton = onSave && (
    <Tooltip
      title={
        readOnly
          ? "No write permission"
          : saveDisabled
            ? "Query unchanged"
            : "Save query to browser"
      }
    >
      <Button
        aria-label="Save query"
        type="text"
        size="small"
        icon={<SaveOutlined />}
        onClick={onSave}
        disabled={readOnly || saveDisabled}
      />
    </Tooltip>
  );

  if (mode === "json") {
    return (
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {modeSwitch}
        </div>
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
      <div className="querySection">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography.Text strong className="querySectionLabel">
            Where labels
          </Typography.Text>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveButton}
            {toolbarExtra}
            {modeSwitch}
          </div>
        </div>
        <ConditionGroupEditor
          group={tree ?? EMPTY_ROOT}
          isRoot
          labelOptions={labelOptions}
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
