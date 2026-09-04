import { ReactNode } from "react";
import { Button, Dropdown, Input, Tooltip, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import {
  KeyValueRow,
  RosExportConfig,
  RosSection,
  RosTransformStep,
} from "../../Helpers/transformStepBuilder";
import {
  ROW_LABEL_WIDTH,
  ROW_INPUT_WIDTH,
  ROW_GAP,
  ROW_GROUP_WIDTH,
} from "./stepRowLayout";
import RowList from "./KeyValueRowList";

const SECTION_LABELS: Record<RosSection, string> = {
  filter: "Filter",
  encode: "Encode",
  label: "As label",
  export: "Export",
};

const ALL_SECTIONS: RosSection[] = ["filter", "encode", "label", "export"];

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
        style={{
          width: ROW_LABEL_WIDTH,
          flexShrink: 0,
          paddingTop: 6,
          fontSize: 12,
        }}
      >
        {SECTION_LABELS[section]}
      </Typography.Text>
      {children}
    </div>
  );
}

function disabledReason(
  section: RosSection,
  step: RosTransformStep,
): string | undefined {
  const hasExtractSection = step.sections.some(
    (s) => s === "filter" || s === "encode" || s === "label",
  );
  const hasExportSection = step.sections.includes("export");

  if (section === "export") {
    if (hasExportSection) return "Export is already added";
    if (hasExtractSection)
      return "Export can't be combined with Filter, Encode, or As label";
    return undefined;
  }
  if (section === "filter") {
    if (step.sections.includes("filter")) return "Filter is already added";
    if (hasExportSection) return "Not available together with Export";
    return undefined;
  }
  // encode / label: never "used up" - clicking again adds another row
  if (hasExportSection) return "Not available together with Export";
  return undefined;
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
  const menuItems = ALL_SECTIONS.map((section) => {
    const reason = disabledReason(section, step);
    return {
      key: section,
      disabled: !!reason,
      label: reason ? (
        <Tooltip title={reason} placement="right">
          <span style={{ color: "rgba(0, 0, 0, 0.25)" }}>
            {SECTION_LABELS[section]}
          </span>
        </Tooltip>
      ) : (
        SECTION_LABELS[section]
      ),
    };
  });

  const handleMenuClick = ({ key }: { key: string }) => {
    const section = key as RosSection;
    if (section === "encode" && step.sections.includes("encode")) {
      onAddEncodeRow();
    } else if (section === "label" && step.sections.includes("label")) {
      onAddAsLabelRow();
    } else {
      onAddSection(section);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {step.sections.includes("filter") && (
        <Section section="filter">
          <div style={{ display: "flex", alignItems: "center", gap: ROW_GAP }}>
            <Input
              placeholder="optional ROS topic filter"
              value={step.topic}
              onChange={(e) => onChangeTopic(e.target.value)}
              style={{ width: ROW_GROUP_WIDTH }}
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
            keyPlaceholder="label name (e.g. lat_x)"
            valuePlaceholder="field (e.g. latitude.x)"
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
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Input
              placeholder="mcap (currently the only format)"
              value={step.export.format}
              onChange={(e) => onChangeExport({ format: e.target.value })}
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <Input
              placeholder="max duration (e.g. 1m)"
              value={step.export.duration}
              onChange={(e) => onChangeExport({ duration: e.target.value })}
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <Input
              placeholder="max size (e.g. 100MB)"
              value={step.export.size}
              onChange={(e) => onChangeExport({ size: e.target.value })}
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <RemoveSectionButton
              section="export"
              onRemove={() => onRemoveSection("export")}
            />
          </div>
        </Section>
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
            href="https://www.reduct.store/docs/extensions/official/ros-ext"
            target="_blank"
            rel="noopener noreferrer"
          >
            <strong>View ReductROS Documentation →</strong>
          </a>
        </Typography.Text>
      </div>
    </div>
  );
}
