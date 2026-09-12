import { ReactNode, CSSProperties, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Dropdown, MenuProps, Switch, Typography } from "antd";
import {
  CloseOutlined,
  DownOutlined,
  EllipsisOutlined,
  PlusCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { ROW_ICON_BUTTON_WIDTH } from "../Stages/stageRowLayout";

interface SortableCardProps {
  id: string;
  label?: string;
  removeLabel?: string;
  onRemove: () => void;
  removable?: boolean;
  isOverlay?: boolean;
  onAddBefore?: () => void;
  onAddAfter?: () => void;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  kindSelector?: ReactNode;
  children: ReactNode;
}

export default function SortableCard({
  id,
  label,
  removeLabel,
  onRemove,
  removable = true,
  isOverlay = false,
  onAddBefore,
  onAddAfter,
  enabled = true,
  onToggleEnabled,
  kindSelector,
  children,
}: SortableCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: isOverlay ? `${id}-overlay` : id });

  const style: CSSProperties = isOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : enabled ? 1 : 0.5,
      };

  const removeButton = removable ? (
    <Button
      aria-label={removeLabel}
      type="text"
      icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
      onClick={onRemove}
      onPointerDown={(e) => e.stopPropagation()}
    />
  ) : (
    <div style={{ width: ROW_ICON_BUTTON_WIDTH, flexShrink: 0 }} />
  );

  const menuItems: MenuProps["items"] = [
    {
      key: "addAfter",
      icon: <PlusCircleOutlined />,
      label: "Add stage after",
      disabled: !onAddAfter,
    },
    {
      key: "addBefore",
      icon: <PlusCircleOutlined />,
      label: "Add stage before",
      disabled: !onAddBefore,
    },
    {
      key: "delete",
      icon: <CloseOutlined />,
      label: "Delete stage",
      disabled: !removable,
    },
    {
      key: "toggleExpand",
      icon: isExpanded ? <DownOutlined /> : <RightOutlined />,
      label: isExpanded ? "Collapse stage" : "Expand stage",
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "addAfter") onAddAfter?.();
    else if (key === "addBefore") onAddBefore?.();
    else if (key === "delete") onRemove();
    else if (key === "toggleExpand") setIsExpanded((prev) => !prev);
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className="queryCard"
    >
      <div
        className="queryCardHeader"
        aria-label="Drag to reorder"
        {...(isOverlay ? {} : attributes)}
        {...(isOverlay ? {} : listeners)}
      >
        <Button
          aria-label={isExpanded ? "Collapse stage" : "Expand stage"}
          type="text"
          size="small"
          icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
          onClick={() => setIsExpanded((prev) => !prev)}
          onPointerDown={(e) => e.stopPropagation()}
        />
        {label && (
          <Typography.Text strong className="queryCardLabel">
            {label}
          </Typography.Text>
        )}
        {kindSelector && (
          <span onPointerDown={(e) => e.stopPropagation()}>{kindSelector}</span>
        )}
        <span onPointerDown={(e) => e.stopPropagation()}>
          <Switch
            aria-label={enabled ? "Disable stage" : "Enable stage"}
            size="small"
            checked={enabled}
            onChange={() => onToggleEnabled?.()}
          />
        </span>
        <div className="queryCardHeaderSpacer" />
        {removeButton}
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          trigger={["click"]}
        >
          <Button
            aria-label="Stage actions"
            type="text"
            icon={<EllipsisOutlined />}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </Dropdown>
      </div>
      {isExpanded && <div className="queryCardBody">{children}</div>}
    </div>
  );
}
