import { ReactNode } from "react";
import { Button, Dropdown, Input, Tooltip, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import {
  KeyValueRow,
  RosExportConfig,
  RosSection,
  RosTransformStep,
} from "../../Helpers/transformStepBuilder";

const SECTION_LABELS: Record<RosSection, string> = {
  filter: "Filter",
  encode: "Encode",
  label: "Label",
  export: "Export",
};

const ALL_SECTIONS: RosSection[] = ["filter", "encode", "label", "export"];

interface RowListProps {
  rows: KeyValueRow[];
  keyPlaceholder: string;
  valuePlaceholder: string;
  onChange: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
  onRemoveSection: () => void;
  sectionRemoveLabel: string;
}

function RowList({
  rows,
  keyPlaceholder,
  valuePlaceholder,
  onChange,
  onRemove,
  removeLabel,
  onRemoveSection,
  sectionRemoveLabel,
}: RowListProps) {
  const onlyRow = rows.length === 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Input
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => onChange(row.id, { key: e.target.value })}
            style={{ flex: 1 }}
          />
          <Input
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => onChange(row.id, { value: e.target.value })}
            style={{ flex: 1 }}
          />
          <Button
            aria-label={onlyRow ? sectionRemoveLabel : removeLabel}
            type="text"
            icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
            onClick={() => (onlyRow ? onRemoveSection() : onRemove(row.id))}
          />
        </div>
      ))}
    </div>
  );
}

interface TransformStepEditorProps {
  step: RosTransformStep;
  onAddSection: (section: RosSection) => void;
  onRemoveSection: (section: RosSection) => void;
  onChangeTopic: (topic: string) => void;
  onAddEncodeRow: () => void;
  onChangeEncodeRow: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemoveEncodeRow: (id: string) => void;
  onAddAsLabelRow: () => void;
  onChangeAsLabelRow: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemoveAsLabelRow: (id: string) => void;
  onChangeExport: (changes: Partial<RosExportConfig>) => void;
}

function RemoveSectionButton({
  section,
  onRemove,
}: {
  section: RosSection;
  onRemove: () => void;
}) {
  return (
    <Button
      aria-label={`Remove ${SECTION_LABELS[section].toLowerCase()}`}
      type="text"
      icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
      onClick={onRemove}
    />
  );
}

function Section({
  section,
  children,
}: {
  section: RosSection;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <Typography.Text
        strong
        style={{ width: 56, flexShrink: 0, paddingTop: 6 }}
      >
        {SECTION_LABELS[section]}
      </Typography.Text>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

const ADD_ENCODE_ROW_KEY = "add_encode_row";
const ADD_LABEL_ROW_KEY = "add_label_row";

function isRowComplete(row: KeyValueRow | undefined): boolean {
  return !!row && row.key.trim() !== "" && row.value.trim() !== "";
}

export default function TransformStepEditor({
  step,
  onAddSection,
  onRemoveSection,
  onChangeTopic,
  onAddEncodeRow,
  onChangeEncodeRow,
  onRemoveEncodeRow,
  onAddAsLabelRow,
  onChangeAsLabelRow,
  onRemoveAsLabelRow,
  onChangeExport,
}: TransformStepEditorProps) {
  // The server accepts only one of extract/export/transform per request, so
  // Export can never coexist with Filter/Encode/Label (which all feed into
  // extract) - confirmed by the server's own rejection message.
  const hasExtractSection = step.sections.some(
    (section) =>
      section === "filter" || section === "encode" || section === "label",
  );
  const hasExportSection = step.sections.includes("export");
  const availableSections = ALL_SECTIONS.filter((section) => {
    if (step.sections.includes(section)) {
      return false;
    }
    if (section === "export" && hasExtractSection) {
      return false;
    }
    if (section !== "export" && hasExportSection) {
      return false;
    }
    return true;
  });

  const menuItems = [
    ...availableSections.map((section) => ({
      key: section,
      label: SECTION_LABELS[section],
    })),
    ...(step.sections.includes("encode") &&
    isRowComplete(step.encode[step.encode.length - 1])
      ? [{ key: ADD_ENCODE_ROW_KEY, label: "Add encode row" }]
      : []),
    ...(step.sections.includes("label") &&
    isRowComplete(step.asLabel[step.asLabel.length - 1])
      ? [{ key: ADD_LABEL_ROW_KEY, label: "Add label row" }]
      : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === ADD_ENCODE_ROW_KEY) {
      onAddEncodeRow();
    } else if (key === ADD_LABEL_ROW_KEY) {
      onAddAsLabelRow();
    } else {
      onAddSection(key as RosSection);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {step.sections.includes("filter") && (
        <Section section="filter">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Input
              placeholder="optional ROS topic filter"
              value={step.topic}
              onChange={(e) => onChangeTopic(e.target.value)}
              style={{ flex: 1 }}
            />
            <Input
              aria-hidden="true"
              tabIndex={-1}
              disabled
              style={{ flex: 1, visibility: "hidden" }}
            />
            <RemoveSectionButton
              section="filter"
              onRemove={() => onRemoveSection("filter")}
            />
          </div>
        </Section>
      )}

      {step.sections.includes("encode") && (
        <Section section="encode">
          <RowList
            rows={step.encode}
            keyPlaceholder="field (e.g. data)"
            valuePlaceholder="encoding (e.g. jpeg)"
            onChange={onChangeEncodeRow}
            onRemove={onRemoveEncodeRow}
            removeLabel="Remove encode mapping"
            onRemoveSection={() => onRemoveSection("encode")}
            sectionRemoveLabel={`Remove ${SECTION_LABELS.encode.toLowerCase()}`}
          />
        </Section>
      )}

      {step.sections.includes("label") && (
        <Section section="label">
          <RowList
            rows={step.asLabel}
            keyPlaceholder="label name (e.g. label_name)"
            valuePlaceholder="field (e.g. latitude)"
            onChange={onChangeAsLabelRow}
            onRemove={onRemoveAsLabelRow}
            removeLabel="Remove label mapping"
            onRemoveSection={() => onRemoveSection("label")}
            sectionRemoveLabel={`Remove ${SECTION_LABELS.label.toLowerCase()}`}
          />
        </Section>
      )}

      {step.sections.includes("export") && (
        <Section section="export">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Input
              placeholder="mcap (currently the only format)"
              value={step.export.format}
              onChange={(e) => onChangeExport({ format: e.target.value })}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="max duration (e.g. 1m)"
              value={step.export.duration}
              onChange={(e) => onChangeExport({ duration: e.target.value })}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="max size (e.g. 100MB)"
              value={step.export.size}
              onChange={(e) => onChangeExport({ size: e.target.value })}
              style={{ flex: 1 }}
            />
            <RemoveSectionButton
              section="export"
              onRemove={() => onRemoveSection("export")}
            />
          </div>
        </Section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <a
            href="https://www.reduct.store/docs/extensions/official/ros-ext"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>View ReductROS Documentation →</strong>
          </a>
        </Typography.Text>
        {(availableSections.length > 0 ||
          step.sections.includes("encode") ||
          step.sections.includes("label")) && (
          <Tooltip
            title={menuItems.length > 0 ? "" : "Fill in the current row first"}
          >
            <span style={{ display: "inline-block" }}>
              <Dropdown
                menu={{ items: menuItems, onClick: handleMenuClick }}
                trigger={menuItems.length > 0 ? ["click"] : []}
                disabled={menuItems.length === 0}
              >
                <Button
                  aria-label="Add option"
                  disabled={menuItems.length === 0}
                  icon={<PlusOutlined style={{ transform: "scale(0.65)" }} />}
                />
              </Dropdown>
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
