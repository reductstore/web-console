import { ReactNode, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Dropdown, MenuProps, Switch, Typography } from "antd";
import {
  CloseOutlined,
  EllipsisOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";

interface SortableCardProps {
  id: string;
  label?: string;
  onRemove: () => void;
  removable?: boolean;
  isOverlay?: boolean;
  onAddBefore?: () => void;
  onAddAfter?: () => void;
  // Whether the "Add stage before/after" menu items should be enabled -
  // separate from onAddBefore/onAddAfter being defined, since those are
  // always wired up (and internally guarded) so the insert-here buttons can
  // stay visible-but-disabled instead of disappearing.
  canInsert?: boolean;
  enabled?: boolean;
  onToggleEnabled?: () => void;
  kindSelector?: ReactNode;
  children: ReactNode;
}

export default function SortableCard({
  id,
  label,
  onRemove,
  removable = true,
  isOverlay = false,
  onAddBefore,
  onAddAfter,
  canInsert = true,
  enabled = true,
  onToggleEnabled,
  kindSelector,
  children,
}: SortableCardProps) {
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

  const menuItems: MenuProps["items"] = [
    {
      key: "addAfter",
      icon: <PlusCircleOutlined />,
      label: "Add stage after",
      disabled: !onAddAfter || !canInsert,
    },
    {
      key: "addBefore",
      icon: <PlusCircleOutlined />,
      label: "Add stage before",
      disabled: !onAddBefore || !canInsert,
    },
    {
      key: "delete",
      icon: <CloseOutlined />,
      label: "Delete stage",
      disabled: !removable,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "addAfter") onAddAfter?.();
    else if (key === "addBefore") onAddBefore?.();
    else if (key === "delete") onRemove();
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
      <div className="queryCardBody">{children}</div>
    </div>
  );
}
