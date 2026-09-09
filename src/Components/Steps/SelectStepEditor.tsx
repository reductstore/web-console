import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  Segmented,
  Select,
  Tooltip,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  CsvConfig,
  KeyValueRow,
  ProtobufConfig,
  ProtobufFieldRow,
  SelectExportConfig,
  SelectFormatSection,
  SelectInputFormat,
  SelectTransformStep,
} from "../../Helpers/transformStepBuilder";
import {
  ROW_GAP,
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

const SQL_INPUT_MAX_WIDTH = 704;

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

type AddOption = "format" | "export" | "asLabel";

const ADD_OPTIONS: AddOption[] = ["format", "export", "asLabel"];

const ADD_OPTION_LABELS: Record<AddOption, string> = {
  format: "Format",
  export: "Export",
  asLabel: "As label",
};

function disabledReason(
  option: AddOption,
  step: SelectTransformStep,
): string | undefined {
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

interface SelectStepEditorProps {
  step: SelectTransformStep;
  onChangeSql: (sql: string) => void;
  onAddFormatSection: (section: SelectFormatSection) => void;
  onRemoveFormatSection: (section: SelectFormatSection) => void;
  onChangeFormat: (format: SelectInputFormat) => void;
  onChangeCsv: (changes: Partial<CsvConfig>) => void;
  onChangeProtobuf: (
    changes: Partial<Pick<ProtobufConfig, "messageName" | "schema">>,
  ) => void;
  onAddProtobufFieldRow: () => void;
  onChangeProtobufFieldRow: (
    id: string,
    changes: Partial<
      Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
    >,
  ) => void;
  onRemoveProtobufFieldRow: (id: string) => void;
  onChangeSelectExport: (changes: Partial<SelectExportConfig>) => void;
  onAddAsLabelRow: () => void;
  onChangeAsLabelRow: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemoveAsLabelRow: (id: string) => void;
}

export default function SelectStepEditor({
  step,
  onChangeSql,
  onAddFormatSection,
  onRemoveFormatSection,
  onChangeFormat,
  onChangeCsv,
  onChangeProtobuf,
  onAddProtobufFieldRow,
  onChangeProtobufFieldRow,
  onRemoveProtobufFieldRow,
  onChangeSelectExport,
  onAddAsLabelRow,
  onChangeAsLabelRow,
  onRemoveAsLabelRow,
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
    if (key === "asLabel") {
      onAddAsLabelRow();
    } else if (key === "export") {
      onAddFormatSection("export");
    } else if (key === "format") {
      onAddFormatSection("csv");
    }
  };

  const activeFormat = activeFormatOf(step);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionRow label="SQL">
        <div style={{ flex: 1, minWidth: 0, maxWidth: SQL_INPUT_MAX_WIDTH }}>
          <QueryEditor language="sql" value={step.sql} onChange={onChangeSql} />
        </div>
      </SectionRow>

      {activeFormat && (
        <SectionRow label="Format">
          <div
            style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}
          >
            <div style={WRAP_ROW_STYLE}>
              <Segmented
                value={activeFormat}
                options={FORMAT_CHOICES}
                onChange={(value) => onChangeFormat(value as SelectInputFormat)}
              />
              {activeFormat === "csv" && (
                <Checkbox
                  checked={step.csv.hasHeaders}
                  onChange={(e) =>
                    onChangeCsv({ hasHeaders: e.target.checked })
                  }
                >
                  Has headers
                </Checkbox>
              )}
              <RemoveSectionButton
                label="Format"
                onRemove={() => onRemoveFormatSection(activeFormat)}
              />
            </div>
            {activeFormat === "protobuf" && (
              <>
                <div style={WRAP_ROW_STYLE}>
                  <Input
                    placeholder="message name"
                    value={step.protobuf.messageName}
                    onChange={(e) =>
                      onChangeProtobuf({ messageName: e.target.value })
                    }
                    style={{ width: PROTOBUF_MESSAGE_NAME_WIDTH }}
                  />
                  <Input
                    placeholder="schema (.proto content)"
                    value={step.protobuf.schema}
                    onChange={(e) =>
                      onChangeProtobuf({ schema: e.target.value })
                    }
                    style={{ width: PROTOBUF_SCHEMA_WIDTH }}
                  />
                </div>
                <ProtobufFieldRowList
                  rows={step.protobuf.fields}
                  onChange={onChangeProtobufFieldRow}
                  onRemove={onRemoveProtobufFieldRow}
                />
                <Button
                  aria-label="Add protobuf field"
                  icon={
                    <PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />
                  }
                  onClick={onAddProtobufFieldRow}
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
              onChange={(value) => onChangeSelectExport({ format: value })}
              style={{ width: VALUE_INPUT_WIDTH }}
            />
            <InputNumber
              aria-label="Export rows"
              placeholder="max rows"
              value={
                step.export.rows === "" ? undefined : Number(step.export.rows)
              }
              onChange={(value) =>
                onChangeSelectExport({
                  rows: value === null ? "" : String(value),
                })
              }
              style={{ width: VALUE_INPUT_WIDTH }}
            />
            <Input
              placeholder="max duration (e.g. 1m)"
              value={step.export.duration}
              onChange={(e) =>
                onChangeSelectExport({ duration: e.target.value })
              }
              style={{ width: EXPORT_DURATION_WIDTH }}
            />
            <RemoveSectionButton
              label="Export"
              onRemove={() => onRemoveFormatSection("export")}
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
            onChange={onChangeAsLabelRow}
            onRemove={onRemoveAsLabelRow}
            removeLabel="Remove label mapping"
            onRemoveSection={() => onRemoveAsLabelRow(step.asLabel[0].id)}
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
