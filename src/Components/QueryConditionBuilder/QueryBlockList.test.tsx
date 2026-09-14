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
        sourceReady
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
        sourceReady
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
        sourceReady
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
        sourceReady
        onReorderBlock={() => {}}
        addStageMenu={<button aria-label="Add stage">Add stage</button>}
      />,
    );
    expect(screen.getByLabelText("Add stage")).toBeTruthy();
  });

  it("shows an insert button between two blocks that calls the earlier block's onAddAfter", () => {
    const onAddAfter = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onAddAfter }), block("b")]}
        sourceReady
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    const insertButtons = screen.getAllByLabelText("Insert stage here");
    expect(insertButtons).toHaveLength(1);
    fireEvent.click(insertButtons[0]);
    expect(onAddAfter).toHaveBeenCalled();
  });

  it("does not render an insert button after the last block", () => {
    render(
      <QueryBlockList
        blocks={[block("a", { onAddAfter: () => {} }), block("b")]}
        sourceReady
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    // Only the button between "a" and "b" - none before "a" or after "b".
    expect(screen.getAllByLabelText("Insert stage here")).toHaveLength(1);
  });

  it("keeps insert buttons visible but disabled when sourceReady is false, instead of hiding them", () => {
    const onAddBefore = vi.fn();
    const onAddAfter = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onAddBefore, onAddAfter }), block("b")]}
        sourceReady={false}
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    const insertButtons = screen.getAllByLabelText("Insert stage here");
    expect(insertButtons).toHaveLength(1);
    insertButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("calls onReorderBlock with the resolved from/to indexes when a block is dragged over another", () => {
    const onReorderBlock = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a"), block("b"), block("c")]}
        sourceReady
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
