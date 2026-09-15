import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  MenuProps,
  Segmented,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  SelectInputFormat,
  SelectTransformStep,
  SqlStep,
} from "../../Helpers/transformStepBuilder";
import { ExtBlockEditorDispatch } from "../../Helpers/extBlockDispatch";
import {
  ROW_GAP,
  ROW_ICON_FONT_SIZE,
  ROW_LABEL_WIDTH,
  ROW_VALUE_COLUMN_WIDTH,
  WRAP_ROW_STYLE,
  VALUE_INPUT_WIDTH,
  EXPORT_DURATION_WIDTH,
  PROTOBUF_MESSAGE_NAME_WIDTH,
  PROTOBUF_SCHEMA_WIDTH,
} from "./stageRowLayout";
import {
  RemoveSectionButton,
  AddOptionFooter,
  GridRow,
  STAGE_GRID_STYLE,
} from "./StageSectionLayout";
import RowList from "./KeyValueRowList";
import ProtobufFieldRowList from "./ProtobufFieldRowList";
import { QueryEditor } from "../QueryEditor";

const FORMAT_CHOICES: { value: SelectInputFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
  { value: "parquet", label: "Parquet" },
  { value: "protobuf", label: "Protobuf" },
];

const EXPORT_FORMATS = ["csv", "json", "parquet"];

// Just tall enough to show 2 lines of SQL plus the toolbar; width matches the
// grid value column (same as the other inputs), with the remove button aside.
const SQL_EDITOR_HEIGHT = 76;

function activeFormatOf(step: SqlStep): SelectInputFormat | undefined {
  return FORMAT_CHOICES.find((f) => step.formatSections.includes(f.value))
    ?.value;
}

type AddOption = "sqlStep" | "format" | "export" | "asLabel";

const ADD_OPTIONS: AddOption[] = ["format", "export", "asLabel", "sqlStep"];

const ADD_OPTION_LABELS: Record<AddOption, string> = {
  sqlStep: "SQL step",
  format: "Format",
  export: "Export",
  asLabel: "As label",
};

function disabledReason(option: AddOption, step: SqlStep): string | undefined {
  if (option === "sqlStep" || option === "asLabel") return undefined;

  if (option === "export") {
    return step.formatSections.includes("export")
      ? "Export is already added"
      : undefined;
  }

  return activeFormatOf(step) !== undefined
    ? "Format is already added"
    : undefined;
}

function SqlStepBlock({
  step,
  label,
  removable,
  dispatch,
}: {
  step: SqlStep;
  label: string;
  removable: boolean;
  dispatch: ExtBlockEditorDispatch;
}) {
  const activeFormat = activeFormatOf(step);

  const menuItems: MenuProps["items"] = ADD_OPTIONS.map((option) => {
    const reason = disabledReason(option, step);
    return {
      key: option,
      disabled: !!reason,
      label: reason ? (
        <Tooltip title={reason} placement="right">
          <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
            {ADD_OPTION_LABELS[option]}
          </span>
        </Tooltip>
      ) : (
        ADD_OPTION_LABELS[option]
      ),
    };
  });

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "sqlStep") {
      dispatch({
        type: "select/addSqlStep",
        id: crypto.randomUUID(),
        afterId: step.id,
      });
    } else if (key === "asLabel") {
      dispatch({
        type: "transform/addAsLabelRow",
        kind: "select",
        stepId: step.id,
        id: crypto.randomUUID(),
      });
    } else if (key === "export") {
      dispatch({
        type: "select/addFormatSection",
        stepId: step.id,
        section: "export",
        fieldId: crypto.randomUUID(),
      });
    } else if (key === "format") {
      dispatch({
        type: "select/addFormatSection",
        stepId: step.id,
        section: "csv",
        fieldId: crypto.randomUUID(),
      });
    }
  };

  return (
    <>
      <div style={{ gridColumn: "1 / -1" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <Typography.Text
            strong
            style={{ fontSize: 12, minWidth: ROW_LABEL_WIDTH }}
          >
            {label}
          </Typography.Text>
          <AddOptionFooter
            label="Add"
            menuItems={menuItems}
            onMenuClick={handleMenuClick}
            ariaLabel={`Add option for ${label}`}
          />
          <div style={{ flex: 1 }} />
          {removable && (
            <RemoveSectionButton
              label={label}
              onRemove={() =>
                dispatch({ type: "select/removeSqlStep", id: step.id })
              }
            />
          )}
        </div>
        <div style={{ marginLeft: ROW_LABEL_WIDTH + ROW_GAP }}>
          <QueryEditor
            language="sql"
            value={step.sql}
            onChange={(sql) =>
              dispatch({ type: "select/changeSql", id: step.id, sql })
            }
            height={SQL_EDITOR_HEIGHT}
            containerStyle={{ width: ROW_VALUE_COLUMN_WIDTH }}
          />
        </div>
      </div>

      {activeFormat && (
        <GridRow
          label="Format"
          actions={
            <RemoveSectionButton
              label={`${label} format`}
              onRemove={() =>
                dispatch({
                  type: "select/removeFormatSection",
                  stepId: step.id,
                  section: activeFormat,
                })
              }
            />
          }
        >
          <div
            style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}
          >
            <div style={WRAP_ROW_STYLE}>
              <Segmented
                value={activeFormat}
                options={FORMAT_CHOICES}
                onChange={(value) =>
                  dispatch({
                    type: "select/changeFormat",
                    stepId: step.id,
                    format: value as SelectInputFormat,
                    fieldId: crypto.randomUUID(),
                  })
                }
              />
              {activeFormat === "csv" && (
                <Checkbox
                  checked={step.csv.hasHeaders}
                  onChange={(e) =>
                    dispatch({
                      type: "select/changeCsv",
                      stepId: step.id,
                      changes: { hasHeaders: e.target.checked },
                    })
                  }
                >
                  Has headers
                </Checkbox>
              )}
            </div>
            {activeFormat === "protobuf" && (
              <>
                <div style={WRAP_ROW_STYLE}>
                  <Input
                    placeholder="message name"
                    value={step.protobuf.messageName}
                    onChange={(e) =>
                      dispatch({
                        type: "select/changeProtobuf",
                        stepId: step.id,
                        changes: { messageName: e.target.value },
                      })
                    }
                    style={{ width: PROTOBUF_MESSAGE_NAME_WIDTH }}
                  />
                  <Input
                    placeholder="schema (.proto content)"
                    value={step.protobuf.schema}
                    onChange={(e) =>
                      dispatch({
                        type: "select/changeProtobuf",
                        stepId: step.id,
                        changes: { schema: e.target.value },
                      })
                    }
                    style={{ width: PROTOBUF_SCHEMA_WIDTH }}
                  />
                </div>
                <ProtobufFieldRowList
                  rows={step.protobuf.fields}
                  onChange={(id, changes) =>
                    dispatch({
                      type: "select/changeProtobufFieldRow",
                      stepId: step.id,
                      id,
                      changes,
                    })
                  }
                  onRemove={(id) =>
                    dispatch({
                      type: "select/removeProtobufFieldRow",
                      stepId: step.id,
                      id,
                    })
                  }
                />
                <Button
                  aria-label="Add protobuf field"
                  shape="circle"
                  size="small"
                  className="addOptionCircleButton"
                  icon={
                    <PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />
                  }
                  onClick={() =>
                    dispatch({
                      type: "select/addProtobufFieldRow",
                      stepId: step.id,
                      id: crypto.randomUUID(),
                    })
                  }
                />
              </>
            )}
          </div>
        </GridRow>
      )}

      {step.formatSections.includes("export") && (
        <GridRow
          label="Export"
          actions={
            <RemoveSectionButton
              label={`${label} export`}
              onRemove={() =>
                dispatch({
                  type: "select/removeFormatSection",
                  stepId: step.id,
                  section: "export",
                })
              }
            />
          }
        >
          <div style={WRAP_ROW_STYLE}>
            <Select
              aria-label="Export format"
              placeholder="format"
              value={step.export.format || undefined}
              options={EXPORT_FORMATS.map((f) => ({ value: f, label: f }))}
              onChange={(value) =>
                dispatch({
                  type: "select/changeExport",
                  stepId: step.id,
                  changes: { format: value },
                })
              }
              style={{ width: VALUE_INPUT_WIDTH }}
            />
            <InputNumber
              aria-label="Export rows"
              placeholder="max rows"
              value={
                step.export.rows === "" ? undefined : Number(step.export.rows)
              }
              onChange={(value) =>
                dispatch({
                  type: "select/changeExport",
                  stepId: step.id,
                  changes: { rows: value === null ? "" : String(value) },
                })
              }
              style={{ width: VALUE_INPUT_WIDTH }}
            />
            <Input
              placeholder="max duration (e.g. 1m)"
              value={step.export.duration}
              onChange={(e) =>
                dispatch({
                  type: "select/changeExport",
                  stepId: step.id,
                  changes: { duration: e.target.value },
                })
              }
              style={{ width: EXPORT_DURATION_WIDTH }}
            />
          </div>
        </GridRow>
      )}

      {step.asLabel.length > 0 && (
        <RowList
          label="As label"
          rows={step.asLabel}
          keyPlaceholder="label name (e.g. lat_x)"
          valuePlaceholder="field (e.g. latitude.x)"
          onChange={(id, changes) =>
            dispatch({
              type: "transform/changeAsLabelRow",
              kind: "select",
              stepId: step.id,
              id,
              changes,
            })
          }
          onRemove={(id) =>
            dispatch({
              type: "transform/removeAsLabelRow",
              kind: "select",
              stepId: step.id,
              id,
            })
          }
          removeLabel="Remove label mapping"
          onRemoveSection={() =>
            dispatch({
              type: "transform/removeAsLabelRow",
              kind: "select",
              stepId: step.id,
              id: step.asLabel[0].id,
            })
          }
          sectionRemoveLabel="Remove label mapping"
        />
      )}
    </>
  );
}

interface SelectStageEditorProps {
  step: SelectTransformStep;
  dispatch: ExtBlockEditorDispatch;
}

export function SelectStageAddButton({
  step,
  dispatch,
}: SelectStageEditorProps) {
  if (step.sqlSteps.length > 0) return null;
  return (
    <AddOptionFooter
      label="Add"
      menuItems={[{ key: "sqlStep", label: ADD_OPTION_LABELS.sqlStep }]}
      onMenuClick={() =>
        dispatch({ type: "select/addSqlStep", id: crypto.randomUUID() })
      }
      ariaLabel="Add option for SQL"
    />
  );
}

export default function SelectStageEditor({
  step,
  dispatch,
}: SelectStageEditorProps) {
  return (
    <div style={STAGE_GRID_STYLE}>
      {step.sqlSteps.map((sqlStep, index) => {
        const label = step.sqlSteps.length > 1 ? `SQL ${index + 1}` : "SQL";
        return (
          <SqlStepBlock
            key={sqlStep.id}
            step={sqlStep}
            label={label}
            removable={step.sqlSteps.length > 1}
            dispatch={dispatch}
          />
        );
      })}
    </div>
  );
}
