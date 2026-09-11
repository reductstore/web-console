import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import QueryBlockList, { BuilderBlock } from "./QueryBlockList";
import { mockJSDOM } from "../../Helpers/TestHelpers";

let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock("@dnd-kit/core", async () => {
  const actual =
    await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      capturedOnDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

beforeEach(() => {
  mockJSDOM();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  capturedOnDragEnd = undefined;
});

const block = (
  id: string,
  overrides: Partial<BuilderBlock> = {},
): BuilderBlock => ({
  id,
  removeLabel: `Remove ${id}`,
  onRemove: () => {},
  enabled: true,
  onToggleEnabled: () => {},
  content: <div>Content {id}</div>,
  ...overrides,
});

describe("QueryBlockList", () => {
  it("renders nothing when there are no blocks", () => {
    render(
      <QueryBlockList
        blocks={[]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
  });

  it("renders each block's position-based stage label, content, and drag handle", () => {
    render(
      <QueryBlockList
        blocks={[block("a"), block("b")]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    expect(screen.getByText("Stage 1")).toBeTruthy();
    expect(screen.getByText("Content a")).toBeTruthy();
    expect(screen.getByText("Stage 2")).toBeTruthy();
    expect(screen.getByText("Content b")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(2);
  });

  it("calls the block's own onRemove from its remove button", () => {
    const onRemove = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onRemove })]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove a"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("renders the addStageMenu slot", () => {
    render(
      <QueryBlockList
        blocks={[]}
        onReorderBlock={() => {}}
        addStageMenu={<button aria-label="Add stage">Add stage</button>}
      />,
    );
    expect(screen.getByLabelText("Add stage")).toBeTruthy();
  });

  it("shows an insert button above the first block when onAddBefore is given", () => {
    const onAddBefore = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onAddBefore }), block("b")]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    const insertButtons = screen.getAllByLabelText("Insert stage here");
    fireEvent.click(insertButtons[0]);
    expect(onAddBefore).toHaveBeenCalled();
  });

  it("hides the insert-before button when the first block has no onAddBefore", () => {
    render(
      <QueryBlockList
        blocks={[block("a", { onAddAfter: () => {} }), block("b")]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    // Only the between-blocks button (from block "a"'s onAddAfter) shows -
    // no leading one, since block "a" has no onAddBefore.
    expect(screen.getAllByLabelText("Insert stage here")).toHaveLength(1);
  });

  it("shows an insert button between two blocks that calls the earlier block's onAddAfter", () => {
    const onAddAfter = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onAddAfter }), block("b")]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    fireEvent.click(screen.getByLabelText("Insert stage here"));
    expect(onAddAfter).toHaveBeenCalled();
  });

  it("does not render an insert button after the last block", () => {
    render(
      <QueryBlockList
        blocks={[block("a", { onAddAfter: () => {} })]}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    expect(screen.queryByLabelText("Insert stage here")).toBeNull();
  });

  it("calls onReorderBlock with the resolved from/to indexes when a block is dragged over another", () => {
    const onReorderBlock = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a"), block("b"), block("c")]}
        onReorderBlock={onReorderBlock}
        addStageMenu={null}
      />,
    );
    capturedOnDragEnd?.({
      active: { id: "a" },
      over: { id: "c" },
    } as DragEndEvent);
    expect(onReorderBlock).toHaveBeenCalledWith(0, 2);
  });
});
