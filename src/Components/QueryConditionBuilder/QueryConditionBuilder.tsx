import { useEffect, useState, ComponentProps, ReactNode } from "react";
import { Button, Modal, Switch, Tooltip, Typography } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { JsonQueryEditor } from "../JsonEditor";
import ConditionListEditor from "./ConditionListEditor";
import {
  FlatCondition,
  addCondition,
  parseBuilderList,
  removeCondition,
  serializeBuilderList,
  updateCondition,
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

function jsonTextToList(text: string): FlatCondition[] | undefined {
  const parsed = safeParseJSON5(text);
  if (!parsed.success) {
    return undefined;
  }
  const result = parseBuilderList(parsed.value);
  return result.success ? result.list : undefined;
}

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
  const [conditions, setConditions] = useState<FlatCondition[]>(() => {
    const parsed = jsonTextToList(value);
    return parsed && parsed.length > 0 ? parsed : addCondition([]);
  });
  // Snapshot of `value` taken when switching into JSON mode. Returning to
  // Builder mode reparses losslessly only if `value` still matches it; any
  // change (typed, formatted, or loaded from a saved query) instead resets
  // the builder entirely rather than attempting a partial reparse.
  const [jsonEntrySnapshot, setJsonEntrySnapshot] = useState<string | null>(
    null,
  );
  // True while the confirmation to discard the JSON edits and reset the
  // builder is pending; the switch to Builder mode is deferred until the
  // user confirms.
  const [pendingReset, setPendingReset] = useState(false);

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

  const applyList = (nextConditions: FlatCondition[]) => {
    setConditions(nextConditions);
    onChange(formatAsStrictJSON(serializeBuilderList(nextConditions)));
  };

  const handleModeChange = (nextMode: "builder" | "json") => {
    if (nextMode === "json") {
      setJsonEntrySnapshot(value);
      setMode("json");
      return;
    }
    if (value !== jsonEntrySnapshot) {
      setPendingReset(true);
      return;
    }
    setMode("builder");
  };

  const confirmReset = () => {
    applyList(addCondition([]));
    setMode("builder");
    setPendingReset(false);
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
        <Modal
          open={pendingReset}
          title="Reset builder?"
          onOk={confirmReset}
          onCancel={() => setPendingReset(false)}
          okText="Continue"
          cancelText="Cancel"
        >
          This will completely reset the builder, discarding the conditions it
          held before switching to JSON. Continue?
        </Modal>
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
        <ConditionListEditor
          conditions={conditions}
          labelOptions={labelOptions}
          onChangeCondition={(id, changes) =>
            applyList(updateCondition(conditions, id, changes))
          }
          onRemoveCondition={(id) => applyList(removeCondition(conditions, id))}
          onAddCondition={() => applyList(addCondition(conditions))}
        />
      </div>
    </div>
  );
}
