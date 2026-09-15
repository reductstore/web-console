import { Input, Tooltip } from "antd";
import {
  RosSection,
  RosTransformStep,
} from "../../Helpers/transformStepBuilder";
import { ExtBlockEditorDispatch } from "../../Helpers/extBlockDispatch";
import { ROS_EXPORT_FIELD_WIDTH, WRAP_ROW_STYLE } from "./stageRowLayout";
import {
  RemoveSectionButton,
  AddOptionFooter,
  GridRow,
  GridFooter,
  STAGE_GRID_STYLE,
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
  dispatch: ExtBlockEditorDispatch;
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
    <div style={STAGE_GRID_STYLE}>
      {step.sections.includes("filter") && (
        <GridRow
          label={SECTION_LABELS.filter}
          actions={
            <RemoveSectionButton
              label={SECTION_LABELS.filter}
              onRemove={() =>
                dispatch({ type: "ros/removeSection", section: "filter" })
              }
            />
          }
        >
          <Input
            placeholder="optional ROS topic filter"
            value={step.topic}
            onChange={(e) =>
              dispatch({ type: "ros/changeTopic", topic: e.target.value })
            }
            style={{ width: "100%" }}
          />
        </GridRow>
      )}

      {step.sections.includes("encode") && (
        <RowList
          label={SECTION_LABELS.encode}
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
      )}

      {step.sections.includes("label") && (
        <RowList
          label={SECTION_LABELS.label}
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
      )}

      {step.sections.includes("export") && (
        <GridRow
          label={SECTION_LABELS.export}
          actions={
            <RemoveSectionButton
              label={SECTION_LABELS.export}
              onRemove={() =>
                dispatch({ type: "ros/removeSection", section: "export" })
              }
            />
          }
        >
          <div style={WRAP_ROW_STYLE}>
            {/* Placeholders are kept short so all three inputs fit on one
                line without truncating - the fuller explanation lives in a
                tooltip instead. */}
            <Tooltip title="mcap is currently the only supported format">
              <Input
                placeholder="mcap"
                value={step.export.format}
                onChange={(e) =>
                  dispatch({
                    type: "ros/changeExport",
                    changes: { format: e.target.value },
                  })
                }
                style={{ width: ROS_EXPORT_FIELD_WIDTH }}
              />
            </Tooltip>
            <Tooltip title="Maximum export duration, e.g. 1m">
              <Input
                placeholder="duration (1m)"
                value={step.export.duration}
                onChange={(e) =>
                  dispatch({
                    type: "ros/changeExport",
                    changes: { duration: e.target.value },
                  })
                }
                style={{ width: ROS_EXPORT_FIELD_WIDTH }}
              />
            </Tooltip>
            <Tooltip title="Maximum export size, e.g. 100MB">
              <Input
                placeholder="size (100MB)"
                value={step.export.size}
                onChange={(e) =>
                  dispatch({
                    type: "ros/changeExport",
                    changes: { size: e.target.value },
                  })
                }
                style={{ width: ROS_EXPORT_FIELD_WIDTH }}
              />
            </Tooltip>
          </div>
        </GridRow>
      )}

      <GridFooter align="value-start">
        <AddOptionFooter menuItems={menuItems} onMenuClick={handleMenuClick} />
      </GridFooter>
    </div>
  );
}
