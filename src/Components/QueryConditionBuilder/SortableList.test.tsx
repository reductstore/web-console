import React from "react";
import { act, render, screen } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import SortableList from "./SortableList";
import { mockJSDOM } from "../../Helpers/TestHelpers";

let capturedOnDragStart: ((event: DragStartEvent) => void) | undefined;
let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock("@dnd-kit/core", async () => {
  const actual =
    await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    // Renders the real DndContext (so nested SortableContext/useSortable
    // still get proper context) but also captures onDragStart/onDragEnd so
    // tests can invoke them directly - simulating a real pointer drag isn't
    // feasible in jsdom.
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      capturedOnDragStart = props.onDragStart;
      capturedOnDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

beforeEach(() => {
  mockJSDOM();
  capturedOnDragStart = undefined;
  capturedOnDragEnd = undefined;
});

interface Item {
  id: string;
  label: string;
}

// A component (rather than a bare div) so the isOverlay prop SortableList
// clones onto the DragOverlay's copy lands somewhere that accepts it,
// instead of leaking onto a native DOM element.
function Chip({ label }: { label: string; isOverlay?: boolean }) {
  return <div>{label}</div>;
}

const items: Item[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
];

const dragEnd = (activeId: string, overId: string | null) =>
  act(() => {
    capturedOnDragEnd?.({
      active: { id: activeId },
      over: overId ? { id: overId } : null,
    } as DragEndEvent);
  });

describe("SortableList", () => {
  it("renders every item via renderItem", () => {
    render(
      <SortableList
        items={items}
        onReorder={() => {}}
        renderItem={(item) => <Chip key={item.id} label={item.label} />}
      />,
    );
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.getByText("B")).toBeTruthy();
    expect(screen.getByText("C")).toBeTruthy();
  });

  it("calls onReorder with the resolved from/to indexes when a drag ends over a different item", () => {
    const onReorder = vi.fn();
    render(
      <SortableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <Chip key={item.id} label={item.label} />}
      />,
    );
    dragEnd("a", "c");
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("does not call onReorder when dropped on itself", () => {
    const onReorder = vi.fn();
    render(
      <SortableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <Chip key={item.id} label={item.label} />}
      />,
    );
    dragEnd("a", "a");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does not call onReorder when dropped outside any droppable", () => {
    const onReorder = vi.fn();
    render(
      <SortableList
        items={items}
        onReorder={onReorder}
        renderItem={(item) => <Chip key={item.id} label={item.label} />}
      />,
    );
    dragEnd("a", null);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("tracks the active drag without crashing, through start and end", () => {
    // DragOverlay's own visibility is gated by dnd-kit's internal
    // sensor-driven drag state, which this mock (invoking the onDragStart/
    // onDragEnd props directly) doesn't set - so its portal rendering isn't
    // observable here. This just confirms the id-tracking plumbing behind
    // it doesn't throw across a full start/end cycle.
    render(
      <SortableList
        items={items}
        onReorder={() => {}}
        renderItem={(item) => <Chip key={item.id} label={item.label} />}
      />,
    );
    act(() => {
      capturedOnDragStart?.({ active: { id: "a" } } as DragStartEvent);
    });
    dragEnd("a", "a");
    expect(screen.getByText("A")).toBeTruthy();
  });
});
