import { Dispatch } from "react";
import { Input, Tooltip } from "antd";
import {
  RosSection,
  RosTransformStep,
} from "../../Helpers/transformStepBuilder";
import { BuilderAction } from "../../Helpers/builderReducer";
import {
  ROW_INPUT_WIDTH,
  ROW_GAP,
  ROW_GROUP_WIDTH,
  WRAP_ROW_STYLE,
} from "./stageRowLayout";
import {
  SectionRow,
  RemoveSectionButton,
  AddOptionFooter,
} from "./StageSectionLayout";
import RowList from "./KeyValueRowList";

const SECTION_LABELS: Record<RosSection, string> = {
  filter: "Filter",
  encode: "Encode",
  label: "As label",
  export: "Export",
};

const ALL_SECTIONS: RosSection[] = ["filter", "encode", "label", "export"];

interface TransformStageEditorProps {
  step: RosTransformStep;
  dispatch: Dispatch<BuilderAction>;
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

export default function TransformStageEditor({
  step,
  dispatch,
}: TransformStageEditorProps) {
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
      dispatch({ type: "ros/addEncodeRow", id: crypto.randomUUID() });
    } else if (section === "label" && step.sections.includes("label")) {
      dispatch({
        type: "transform/addAsLabelRow",
        kind: "ros",
        id: crypto.randomUUID(),
      });
    } else {
      dispatch({ type: "ros/addSection", section, rowId: crypto.randomUUID() });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {step.sections.includes("filter") && (
        <SectionRow label={SECTION_LABELS.filter}>
          <div style={{ display: "flex", alignItems: "center", gap: ROW_GAP }}>
            <Input
              placeholder="optional ROS topic filter"
              value={step.topic}
              onChange={(e) =>
                dispatch({ type: "ros/changeTopic", topic: e.target.value })
              }
              style={{ width: ROW_GROUP_WIDTH }}
            />
            <RemoveSectionButton
              label={SECTION_LABELS.filter}
              onRemove={() =>
                dispatch({ type: "ros/removeSection", section: "filter" })
              }
            />
          </div>
        </SectionRow>
      )}

      {step.sections.includes("encode") && (
        <SectionRow label={SECTION_LABELS.encode}>
          <RowList
            rows={step.encode}
            keyPlaceholder="field (e.g. data)"
            valuePlaceholder="encoding (e.g. jpeg)"
            onChange={(id, changes) =>
              dispatch({ type: "ros/changeEncodeRow", id, changes })
            }
            onRemove={(id) => dispatch({ type: "ros/removeEncodeRow", id })}
            removeLabel="Remove encode mapping"
            onRemoveSection={() =>
              dispatch({ type: "ros/removeSection", section: "encode" })
            }
            sectionRemoveLabel={`Remove ${SECTION_LABELS.encode.toLowerCase()}`}
          />
        </SectionRow>
      )}

      {step.sections.includes("label") && (
        <SectionRow label={SECTION_LABELS.label}>
          <RowList
            rows={step.asLabel}
            keyPlaceholder="label name (e.g. lat_x)"
            valuePlaceholder="field (e.g. latitude.x)"
            onChange={(id, changes) =>
              dispatch({
                type: "transform/changeAsLabelRow",
                kind: "ros",
                id,
                changes,
              })
            }
            onRemove={(id) =>
              dispatch({ type: "transform/removeAsLabelRow", kind: "ros", id })
            }
            removeLabel="Remove label mapping"
            onRemoveSection={() =>
              dispatch({ type: "ros/removeSection", section: "label" })
            }
            sectionRemoveLabel={`Remove ${SECTION_LABELS.label.toLowerCase()}`}
          />
        </SectionRow>
      )}

      {step.sections.includes("export") && (
        <SectionRow label={SECTION_LABELS.export}>
          <div style={WRAP_ROW_STYLE}>
            <Input
              placeholder="mcap (currently the only format)"
              value={step.export.format}
              onChange={(e) =>
                dispatch({
                  type: "ros/changeExport",
                  changes: { format: e.target.value },
                })
              }
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <Input
              placeholder="max duration (e.g. 1m)"
              value={step.export.duration}
              onChange={(e) =>
                dispatch({
                  type: "ros/changeExport",
                  changes: { duration: e.target.value },
                })
              }
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <Input
              placeholder="max size (e.g. 100MB)"
              value={step.export.size}
              onChange={(e) =>
                dispatch({
                  type: "ros/changeExport",
                  changes: { size: e.target.value },
                })
              }
              style={{ width: ROW_INPUT_WIDTH }}
            />
            <RemoveSectionButton
              label={SECTION_LABELS.export}
              onRemove={() =>
                dispatch({ type: "ros/removeSection", section: "export" })
              }
            />
          </div>
        </SectionRow>
      )}

      <AddOptionFooter
        menuItems={menuItems}
        onMenuClick={handleMenuClick}
        docHref="https://www.reduct.store/docs/extensions/official/ros-ext"
        docLabel="View ReductROS Documentation →"
      />
    </div>
  );
}
