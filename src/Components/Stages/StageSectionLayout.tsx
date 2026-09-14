import { CSSProperties, ReactNode } from "react";
import { Button, Dropdown, MenuProps, Typography } from "antd";
import {
  CloseOutlined,
  PlusOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  ROW_LABEL_WIDTH,
  ROW_ICON_FONT_SIZE,
  ROW_VALUE_COLUMN_WIDTH,
  ROW_GAP,
} from "./stageRowLayout";

export const STAGE_GRID_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: `${ROW_LABEL_WIDTH}px ${ROW_VALUE_COLUMN_WIDTH}px max-content`,
  rowGap: 16,
  columnGap: ROW_GAP,
  alignItems: "start",
};

export function GridRow({
  label,
  actions,
  children,
}: {
  label: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Typography.Text strong style={{ fontSize: 12, paddingTop: 6 }}>
        {label}
      </Typography.Text>
      <div>{children}</div>
      <div style={{ display: "flex" }}>{actions}</div>
    </>
  );
}

// Shared single-row layout for stages that have exactly one field (Limit,
// Sample) - a bold, fixed-width label followed by the field itself, both on
// one line. These stages render straight into the card body instead of into
// a STAGE_GRID_STYLE grid, so this can't reuse GridRow.
export function SingleRowStageContent({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: ROW_GAP,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography.Text
        strong
        style={{ width: ROW_LABEL_WIDTH, flexShrink: 0, fontSize: 12 }}
      >
        {label}
      </Typography.Text>
      {children}
    </div>
  );
}

export function GridFooter({
  children,
  align = "center",
}: {
  children: ReactNode;
  // "Add option" dropdowns (with hidden sub-choices) stay centered under
  // the value column, matching every other stage's convention - but a
  // plain "add another row" action like "Add SQL row" reads more like a
  // list append, so it sits in the label column instead, flush with the
  // "ROS"/"SQL" labels above it rather than indented past them.
  align?: "center" | "start";
}) {
  if (align === "start") {
    return (
      <>
        <div style={{ display: "flex" }}>{children}</div>
        <div />
        <div />
      </>
    );
  }
  return (
    <>
      <div />
      <div style={{ display: "flex", justifyContent: "center" }}>
        {children}
      </div>
      <div />
    </>
  );
}

export function RemoveSectionButton({
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
      icon={<CloseOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
      onClick={onRemove}
    />
  );
}

export function AddOptionFooter({
  menuItems,
  onMenuClick,
  ariaLabel = "Add option",
  label = "Add option",
}: {
  menuItems: MenuProps["items"];
  onMenuClick: MenuProps["onClick"];
  ariaLabel?: string;
  // Visible text next to the "+" - a bare "+" circle doesn't hint that it
  // opens a menu of otherwise-hidden choices (filter/encode/label/export
  // for ROS, format/protobuf/export/as-label for Select), so this is shown
  // by default instead of opt-in.
  label?: string;
}) {
  return (
    <Dropdown
      menu={{ items: menuItems, onClick: onMenuClick }}
      trigger={["click"]}
    >
      <Button
        aria-label={ariaLabel}
        icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
      >
        {label}
      </Button>
    </Dropdown>
  );
}

export function AddOptionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

// Compact warning shown in the stage header, right after the enable/disable
// toggle, so the license requirement is visible at a glance instead of
// buried at the bottom of the card.
export function ExtensionsLicenseNotice() {
  return (
    <Typography.Text
      type="secondary"
      style={{
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      <WarningOutlined style={{ color: "#faad14" }} />
      Requires a{" "}
      <a
        href="https://www.reduct.store/pricing"
        target="_blank"
        rel="noopener noreferrer"
      >
        ReductStore Pro
      </a>{" "}
      license
    </Typography.Text>
  );
}

export function ExtensionsDocLink() {
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      <a
        href="https://www.reduct.store/docs/extensions"
        target="_blank"
        rel="noopener noreferrer"
      >
        <strong>View Extensions Documentation →</strong>
      </a>
    </Typography.Text>
  );
}
