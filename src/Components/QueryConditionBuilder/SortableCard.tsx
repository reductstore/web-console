import { ReactNode, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Typography } from "antd";
import { CloseOutlined, HolderOutlined } from "@ant-design/icons";

interface SortableCardProps {
  id: string;
  label?: string;
  removeLabel?: string;
  onRemove: () => void;
  removable?: boolean;
  isOverlay?: boolean;
  children: ReactNode;
}

export default function SortableCard({
  id,
  label,
  removeLabel,
  onRemove,
  removable = true,
  isOverlay = false,
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
        opacity: isDragging ? 0.4 : 1,
      };

  const removeButton = removable ? (
    <Button
      aria-label={removeLabel}
      type="text"
      icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
      onClick={onRemove}
    />
  ) : (
    <div style={{ width: 32, flexShrink: 0 }} />
  );

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      className="queryCard"
    >
      <div className="queryCardHeader">
        <span
          className="queryCardHandle"
          aria-label="Drag to reorder"
          {...(isOverlay ? {} : attributes)}
          {...(isOverlay ? {} : listeners)}
        >
          <HolderOutlined />
        </span>
        {label && (
          <Typography.Text strong className="queryCardLabel">
            {label}
          </Typography.Text>
        )}
        {removeButton}
      </div>
      <div className="queryCardBody">{children}</div>
    </div>
  );
}
