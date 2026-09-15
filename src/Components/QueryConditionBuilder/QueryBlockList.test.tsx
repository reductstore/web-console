import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import QueryBlockList, { BuilderBlock } from "./QueryBlockList";
import { mockJSDOM } from "../../Helpers/TestHelpers";

// Once opened, antd/rc-trigger keeps a closed dropdown's popup mounted (mid
// leave-animation forever, since jsdom never fires the animation-end event
// that would let it unmount), so the currently open one is the one with no
// "-leave" class.
const openActionsMenu = () => {
  const menus = Array.from(document.querySelectorAll(".ant-dropdown"));
  return menus.filter((menu) => !menu.className.includes("-leave")).at(-1) as
    | HTMLElement
    | undefined;
};

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
        insertDisabledHint=""
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
        insertDisabledHint=""
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

  it("calls the block's own onRemove from its actions menu's Delete stage item", async () => {
    const onRemove = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onRemove })]}
        insertDisabledHint=""
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Stage actions"));
    });
    await act(async () => {
      fireEvent.click(within(openActionsMenu()!).getByText("Delete stage"));
    });
    expect(onRemove).toHaveBeenCalled();
  });

  it("renders the addStageMenu slot", () => {
    render(
      <QueryBlockList
        blocks={[]}
        insertDisabledHint=""
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
        insertDisabledHint=""
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
        insertDisabledHint=""
        onReorderBlock={() => {}}
        addStageMenu={null}
      />,
    );
    // Only the button between "a" and "b" - none before "a" or after "b".
    expect(screen.getAllByLabelText("Insert stage here")).toHaveLength(1);
  });

  it("keeps insert buttons visible but disabled when insertion is blocked, instead of hiding them", () => {
    const onAddBefore = vi.fn();
    const onAddAfter = vi.fn();
    render(
      <QueryBlockList
        blocks={[block("a", { onAddBefore, onAddAfter }), block("b")]}
        insertDisabledHint="Select a bucket and entries first"
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
        insertDisabledHint=""
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
