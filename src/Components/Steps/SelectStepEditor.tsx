import { Dispatch, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
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
} from "./stepRowLayout";
import {
  SectionRow,
  RemoveSectionButton,
  AddOptionFooter,
} from "./StepSectionLayout";
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

function activeFormatOf(
  step: SelectTransformStep,
): SelectInputFormat | undefined {
  return FORMAT_CHOICES.find((f) => step.formatSections.includes(f.value))
    ?.value;
}

type AddOption = "sql" | "format" | "export" | "asLabel";

const ADD_OPTIONS: AddOption[] = ["sql", "format", "export", "asLabel"];

const ADD_OPTION_LABELS: Record<AddOption, string> = {
  sql: "Add SQL row",
  format: "Format",
  export: "Export",
  asLabel: "As label",
};

function disabledReason(
  option: AddOption,
  step: SelectTransformStep,
): string | undefined {
  if (option === "sql" || option === "asLabel") return undefined;

  if (option === "export") {
    return step.formatSections.includes("export")
      ? "Export is already added"
      : undefined;
  }

  return activeFormatOf(step) !== undefined
    ? "Format is already added"
    : undefined;
}

function SqlStepPreview({
  value,
  onChange,
  editLabel,
  isFirst,
}: {
  value: string;
  onChange: (value: string) => void;
  editLabel: string;
  isFirst: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = isFirst && !value.trim() ? DEFAULT_SQL : value;

  return (
    <>
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
        {displayValue.trim() ? (
          displayValue
        ) : (
          <span style={{ color: "#8c8c8c" }}>No SQL yet</span>
        )}
      </div>
      <Button
        aria-label={editLabel}
        type="text"
        icon={<EditOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
        onClick={() => setIsEditing(true)}
      />
      {isEditing && (
        <Modal
          open={isEditing}
          onCancel={() => setIsEditing(false)}
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
              value={displayValue}
              onChange={onChange}
              height="100%"
              containerStyle={{ flex: 1, minHeight: 0 }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

interface SelectStepEditorProps {
  step: SelectTransformStep;
  dispatch: Dispatch<BuilderAction>;
}

export default function SelectStepEditor({
  step,
  dispatch,
}: SelectStepEditorProps) {
  const menuItems = ADD_OPTIONS.map((option) => {
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

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "sql") {
      dispatch({ type: "select/addSqlStep", id: crypto.randomUUID() });
    } else if (key === "asLabel") {
      dispatch({
        type: "transform/addAsLabelRow",
        kind: "select",
        id: crypto.randomUUID(),
      });
    } else if (key === "export") {
      dispatch({
        type: "select/addFormatSection",
        section: "export",
        fieldId: crypto.randomUUID(),
      });
    } else if (key === "format") {
      dispatch({
        type: "select/addFormatSection",
        section: "csv",
        fieldId: crypto.randomUUID(),
      });
    }
  };

  const activeFormat = activeFormatOf(step);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {step.sqlSteps.map((sqlStep, index) => {
        const label = step.sqlSteps.length > 1 ? `SQL ${index + 1}` : "SQL";
        return (
          <SectionRow key={sqlStep.id} label={label}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: ROW_GAP,
              }}
            >
              <SqlStepPreview
                value={sqlStep.sql}
                editLabel={`Edit ${label}`}
                isFirst={index === 0}
                onChange={(sql) =>
                  dispatch({ type: "select/changeSql", id: sqlStep.id, sql })
                }
              />
              {step.sqlSteps.length > 1 && (
                <RemoveSectionButton
                  label={label}
                  onRemove={() =>
                    dispatch({ type: "select/removeSqlStep", id: sqlStep.id })
                  }
                />
              )}
            </div>
          </SectionRow>
        );
      })}

      {activeFormat && (
        <SectionRow label="Format">
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
                      changes: { hasHeaders: e.target.checked },
                    })
                  }
                >
                  Has headers
                </Checkbox>
              )}
              <RemoveSectionButton
                label="Format"
                onRemove={() =>
                  dispatch({
                    type: "select/removeFormatSection",
                    section: activeFormat,
                  })
                }
              />
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
                      id,
                      changes,
                    })
                  }
                  onRemove={(id) =>
                    dispatch({ type: "select/removeProtobufFieldRow", id })
                  }
                />
                <Button
                  aria-label="Add protobuf field"
                  icon={
                    <PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />
                  }
                  onClick={() =>
                    dispatch({
                      type: "select/addProtobufFieldRow",
                      id: crypto.randomUUID(),
                    })
                  }
                />
              </>
            )}
          </div>
        </SectionRow>
      )}

      {step.formatSections.includes("export") && (
        <SectionRow label="Export">
          <div style={WRAP_ROW_STYLE}>
            <Select
              aria-label="Export format"
              placeholder="format"
              value={step.export.format || undefined}
              options={EXPORT_FORMATS.map((f) => ({ value: f, label: f }))}
              onChange={(value) =>
                dispatch({
                  type: "select/changeExport",
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
                  changes: { duration: e.target.value },
                })
              }
              style={{ width: EXPORT_DURATION_WIDTH }}
            />
            <RemoveSectionButton
              label="Export"
              onRemove={() =>
                dispatch({
                  type: "select/removeFormatSection",
                  section: "export",
                })
              }
            />
          </div>
        </SectionRow>
      )}

      {step.asLabel.length > 0 && (
        <SectionRow label="As label">
          <RowList
            rows={step.asLabel}
            keyPlaceholder="label name (e.g. lat_x)"
            valuePlaceholder="field (e.g. latitude.x)"
            onChange={(id, changes) =>
              dispatch({
                type: "transform/changeAsLabelRow",
                kind: "select",
                id,
                changes,
              })
            }
            onRemove={(id) =>
              dispatch({
                type: "transform/removeAsLabelRow",
                kind: "select",
                id,
              })
            }
            removeLabel="Remove label mapping"
            onRemoveSection={() =>
              dispatch({
                type: "transform/removeAsLabelRow",
                kind: "select",
                id: step.asLabel[0].id,
              })
            }
            sectionRemoveLabel="Remove label mapping"
          />
        </SectionRow>
      )}

      <AddOptionFooter
        menuItems={menuItems}
        onMenuClick={handleMenuClick}
        docHref="https://www.reduct.store/docs/extensions/official/select-ext"
        docLabel="View ReductSelect Documentation →"
      />
    </div>
  );
}
