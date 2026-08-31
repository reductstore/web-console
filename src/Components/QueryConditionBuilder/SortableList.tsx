import {
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useState,
} from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  renderItem: (item: T) => ReactNode;
}

export default function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = items.findIndex((item) => item.id === active.id);
    const toIndex = items.findIndex((item) => item.id === over.id);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    onReorder(fromIndex, toIndex);
  };

  const activeItem = items.find((item) => item.id === activeId);
  const overlayElement = activeItem ? renderItem(activeItem) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => renderItem(item))}
      </SortableContext>
      {/* Renders a floating, unconstrained clone of the dragged card that
          follows the pointer - without it, the card being dragged stays
          laid out (and clipped/squished) inside its original container,
          which is what happens when it's pushed toward the container's
          edge. */}
      <DragOverlay>
        {overlayElement && isValidElement(overlayElement)
          ? cloneElement(
              overlayElement as ReactElement<{ isOverlay?: boolean }>,
              { isOverlay: true },
            )
          : overlayElement}
      </DragOverlay>
    </DndContext>
  );
}
