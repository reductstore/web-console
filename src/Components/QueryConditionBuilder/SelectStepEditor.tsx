import { ReactNode } from "react";
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  InputNumber,
  Segmented,
  Select,
  Tooltip,
  Typography,
} from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
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
  ROW_LABEL_WIDTH,
  ROW_GAP,
  VALUE_INPUT_WIDTH,
  EXPORT_DURATION_WIDTH,
  PROTOBUF_MESSAGE_NAME_WIDTH,
  PROTOBUF_SCHEMA_WIDTH,
} from "./stepRowLayout";
import RowList from "./KeyValueRowList";
import ProtobufFieldRowList from "./ProtobufFieldRowList";

const SQL_INPUT_WIDTH = 704;

const FORMAT_CHOICES: { value: SelectInputFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "json", label: "JSON" },
  { value: "parquet", label: "Parquet" },
];

const EXPORT_FORMATS = FORMAT_CHOICES.map((f) => f.value);

function activeFormatOf(
  step: SelectTransformStep,
): SelectInputFormat | undefined {
  return FORMAT_CHOICES.find((f) => step.formatSections.includes(f.value))
    ?.value;
}

type AddOption = "format" | "protobuf" | "export" | "asLabel";

const ADD_OPTIONS: AddOption[] = ["format", "protobuf", "export", "asLabel"];

const ADD_OPTION_LABELS: Record<AddOption, string> = {
  format: "Format",
  protobuf: "Protobuf",
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

  const hasFormat = activeFormatOf(step) !== undefined;
  const hasProtobuf = step.formatSections.includes("protobuf");

  if (option === "protobuf") {
    return hasFormat ? "Not available together with Format" : undefined;
  }

  if (hasFormat) return "Format is already added";
  if (hasProtobuf) return "Not available together with Protobuf";
  return undefined;
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

function RemoveSectionButton({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Button
      aria-label={`Remove ${label.toLowerCase()}`}
      type="text"
      icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
      onClick={onRemove}
    />
  );
}

function FormatSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <Typography.Text
        strong
        style={{
          width: ROW_LABEL_WIDTH,
          flexShrink: 0,
          paddingTop: 6,
          fontSize: 12,
        }}
      >
        {label}
      </Typography.Text>
      {children}
    </div>
  );
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
    } else if (key === "protobuf") {
      if (step.formatSections.includes("protobuf")) {
        onAddProtobufFieldRow();
      } else {
        onAddFormatSection("protobuf");
      }
    } else if (key === "export") {
      onAddFormatSection("export");
    } else if (key === "format") {
      onAddFormatSection("csv");
    }
  };

  const activeFormat = activeFormatOf(step);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <FormatSection label="SQL">
        <Input
          placeholder="SELECT * FROM ENTRY()"
          value={step.sql}
          onChange={(e) => onChangeSql(e.target.value)}
          style={{ width: SQL_INPUT_WIDTH }}
        />
      </FormatSection>

      {activeFormat && (
        <FormatSection label="Format">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: ROW_GAP,
            }}
          >
            <Segmented
              value={activeFormat}
              options={FORMAT_CHOICES}
              onChange={(value) => onChangeFormat(value as SelectInputFormat)}
            />
            {activeFormat === "csv" && (
              <Checkbox
                checked={step.csv.hasHeaders}
                onChange={(e) => onChangeCsv({ hasHeaders: e.target.checked })}
              >
                Has headers
              </Checkbox>
            )}
            <RemoveSectionButton
              label="Format"
              onRemove={() => onRemoveFormatSection(activeFormat)}
            />
          </div>
        </FormatSection>
      )}

      {step.formatSections.includes("protobuf") && (
        <FormatSection label="Protobuf">
          <div
            style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: ROW_GAP,
              }}
            >
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
                onChange={(e) => onChangeProtobuf({ schema: e.target.value })}
                style={{ width: PROTOBUF_SCHEMA_WIDTH }}
              />
              <RemoveSectionButton
                label="Protobuf"
                onRemove={() => onRemoveFormatSection("protobuf")}
              />
            </div>
            <ProtobufFieldRowList
              rows={step.protobuf.fields}
              onChange={onChangeProtobufFieldRow}
              onRemove={onRemoveProtobufFieldRow}
            />
          </div>
        </FormatSection>
      )}

      {step.formatSections.includes("export") && (
        <FormatSection label="Export">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: ROW_GAP,
            }}
          >
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
        </FormatSection>
      )}

      {step.asLabel.length > 0 && (
        <FormatSection label="As label">
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
        </FormatSection>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
        >
          <Button
            aria-label="Add option"
            icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
          />
        </Dropdown>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <a
            href="https://www.reduct.store/docs/extensions/official/select-ext"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>View ReductSelect Documentation →</strong>
          </a>
        </Typography.Text>
      </div>
    </div>
  );
}
