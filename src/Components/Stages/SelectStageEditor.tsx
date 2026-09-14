import { Dispatch, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  MenuProps,
  Modal,
  Segmented,
  Select,
  Tooltip,
} from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
  DEFAULT_SQL,
  SelectInputFormat,
  SelectTransformStep,
  SqlStep,
} from "../../Helpers/transformStepBuilder";
import { BuilderAction } from "../../Helpers/builderReducer";
import {
  ROW_GAP,
  ROW_GROUP_WIDTH,
  ROW_ICON_FONT_SIZE,
  WRAP_ROW_STYLE,
  VALUE_INPUT_WIDTH,
  EXPORT_DURATION_WIDTH,
  PROTOBUF_MESSAGE_NAME_WIDTH,
  PROTOBUF_SCHEMA_WIDTH,
} from "./stageRowLayout";
import {
  RemoveSectionButton,
  AddOptionFooter,
  AddOptionButton,
  GridRow,
  GridFooter,
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

function activeFormatOf(step: SqlStep): SelectInputFormat | undefined {
  return FORMAT_CHOICES.find((f) => step.formatSections.includes(f.value))
    ?.value;
}

type AddOption = "format" | "export" | "asLabel";

const ADD_OPTIONS: AddOption[] = ["format", "export", "asLabel"];

const ADD_OPTION_LABELS: Record<AddOption, string> = {
  format: "Format",
  export: "Export",
  asLabel: "As label",
};

function disabledReason(option: AddOption, step: SqlStep): string | undefined {
  if (option === "asLabel") return undefined;

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
  isFirst,
  removable,
  dispatch,
}: {
  step: SqlStep;
  label: string;
  isFirst: boolean;
  removable: boolean;
  dispatch: Dispatch<BuilderAction>;
}) {
  const activeFormat = activeFormatOf(step);
  const [isEditingSql, setIsEditingSql] = useState(false);
  const displaySql = isFirst && !step.sql.trim() ? DEFAULT_SQL : step.sql;

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
    if (key === "asLabel") {
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
      <GridRow
        label={label}
        actions={
          <>
            <Button
              aria-label={`Edit ${label}`}
              type="text"
              icon={<EditOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
              onClick={() => setIsEditingSql(true)}
            />
            {removable && (
              <RemoveSectionButton
                label={label}
                onRemove={() =>
                  dispatch({ type: "select/removeSqlStep", id: step.id })
                }
              />
            )}
          </>
        }
      >
        <div
          style={{
            minWidth: ROW_GROUP_WIDTH,
            border: "1px solid #d9d9d9",
            borderRadius: 6,
            padding: "6px 10px",
            background: "#fafafa",
            fontFamily: "monospace",
            fontSize: 13,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {displaySql.trim() ? (
            displaySql
          ) : (
            <span style={{ color: "#8c8c8c" }}>No SQL yet</span>
          )}
        </div>
      </GridRow>
      {isEditingSql && (
        <Modal
          open={isEditingSql}
          onCancel={() => setIsEditingSql(false)}
          footer={null}
          closable
          title="SQL Editor"
          mask={{ closable: false }}
          keyboard={false}
          className="jsonQueryEditorModal"
          width="90vw"
          centered
        >
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <QueryEditor
              language="sql"
              value={displaySql}
              onChange={(sql) =>
                dispatch({ type: "select/changeSql", id: step.id, sql })
              }
              height="100%"
              containerStyle={{ flex: 1, minHeight: 0 }}
              allowExpand={false}
            />
          </div>
        </Modal>
      )}

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

      <GridFooter>
        <AddOptionFooter
          menuItems={menuItems}
          onMenuClick={handleMenuClick}
          ariaLabel={`Add option for ${label}`}
        />
      </GridFooter>
    </>
  );
}

interface SelectStageEditorProps {
  step: SelectTransformStep;
  dispatch: Dispatch<BuilderAction>;
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
            isFirst={index === 0}
            removable={step.sqlSteps.length > 1}
            dispatch={dispatch}
          />
        );
      })}

      <GridFooter align="start">
        <AddOptionButton
          label="Add SQL row"
          onClick={() =>
            dispatch({ type: "select/addSqlStep", id: crypto.randomUUID() })
          }
        />
      </GridFooter>
    </div>
  );
}
