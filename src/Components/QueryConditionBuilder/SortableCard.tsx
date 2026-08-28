import { ReactNode, CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Typography } from "antd";
import { CloseOutlined, HolderOutlined } from "@ant-design/icons";

interface SortableCardProps {
  id: string;
  // Omit to render the row with no label of its own (e.g. rows grouped
  // inside one shared bordered block that already has its own title).
  label?: string;
  removeLabel?: string;
  onRemove: () => void;
  removable?: boolean;
  // Renders the fields on the header row, beside the label, instead of on
  // their own row below - for cards whose fields are compact enough to fit.
  inline?: boolean;
  // True for the floating clone SortableList renders in its DragOverlay
  // while this card is being dragged - purely visual (no ref, no drag
  // listeners, no transform), and registered under a distinct dnd-kit id
  // so it never fights the real list item for the same registration.
  isOverlay?: boolean;
  children: ReactNode;
}

export default function SortableCard({
  id,
  label,
  removeLabel,
  onRemove,
  removable = true,
  inline = false,
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
        // The card being dragged gets a floating clone in SortableList's
        // DragOverlay - fade this one to a placeholder rather than
        // showing it twice.
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
          <Typography.Text
            strong
            className="queryCardLabel"
            style={inline ? { flex: "0 0 auto", width: 60 } : undefined}
          >
            {label}
          </Typography.Text>
        )}
        {inline && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            {children}
          </div>
        )}
        {removeButton}
      </div>
      {!inline && <div className="queryCardBody">{children}</div>}
    </div>
  );
}
