import { ReactNode } from "react";
import { Button, Dropdown, MenuProps, Typography } from "antd";
import { CloseOutlined, PlusOutlined } from "@ant-design/icons";
import { ROW_LABEL_WIDTH, ROW_ICON_FONT_SIZE } from "./stepRowLayout";

export function SectionRow({
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
  docHref,
  docLabel,
}: {
  menuItems: MenuProps["items"];
  onMenuClick: MenuProps["onClick"];
  docHref: string;
  docLabel: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Dropdown
        menu={{ items: menuItems, onClick: onMenuClick }}
        trigger={["click"]}
      >
        <Button
          aria-label="Add option"
          icon={<PlusOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
        />
      </Dropdown>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        <a href={docHref} target="_blank" rel="noopener noreferrer">
          <strong>{docLabel}</strong>
        </a>
      </Typography.Text>
    </div>
  );
}
