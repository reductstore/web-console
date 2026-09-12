import React, { ComponentProps } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import SortableCard from "./SortableCard";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeEach(() => mockJSDOM());

// Menu items carry an icon with its own aria-label (e.g. "plus-circle"),
// which the accessible-name algorithm folds into the menuitem's name -
// so a plain text lookup is used instead of a role+name match. Once opened,
// antd/rc-trigger also keeps a closed dropdown's popup mounted (mid
// leave-animation forever, since jsdom never fires the animation-end event
// that would let it unmount), so the currently open one is the one with no
// "-leave" class.
const openActionsMenu = () => {
  const menus = Array.from(document.querySelectorAll(".ant-dropdown"));
  return menus.filter((menu) => !menu.className.includes("-leave")).at(-1) as
    | HTMLElement
    | undefined;
};

const renderCard = (props: Partial<ComponentProps<typeof SortableCard>> = {}) =>
  render(
    <DndContext onDragEnd={() => {}}>
      <SortableContext items={["row-1"]}>
        <SortableCard
          id="row-1"
          label="Condition"
          removeLabel="Remove condition"
          onRemove={() => {}}
          {...props}
        >
          <div>fields</div>
        </SortableCard>
      </SortableContext>
    </DndContext>,
  );

describe("SortableCard", () => {
  it("renders the label and children", () => {
    renderCard();
    expect(screen.getByText("Condition")).toBeTruthy();
    expect(screen.getByText("fields")).toBeTruthy();
  });

  it("shows a drag handle", () => {
    renderCard();
    expect(screen.getByLabelText("Drag to reorder")).toBeTruthy();
  });

  it("calls onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn();
    renderCard({ onRemove });
    fireEvent.click(screen.getByLabelText("Remove condition"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("hides the remove button when not removable", () => {
    renderCard({ removable: false });
    expect(screen.queryByLabelText("Remove condition")).toBeNull();
  });

  it("renders a non-interactive handle when used as an overlay clone", () => {
    renderCard({ isOverlay: true });
    const handle = screen.getByLabelText("Drag to reorder");
    expect(handle).not.toHaveAttribute("role", "button");
    expect(handle).not.toHaveAttribute("tabindex");
  });

  it("disables Add stage before/after in the actions menu when no handler is given", async () => {
    renderCard();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Stage actions"));
    });
    const menu = within(openActionsMenu()!);
    expect(menu.getByText("Add stage before").closest("li")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(menu.getByText("Add stage after").closest("li")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("disables Add stage before/after when canInsert is false, even with handlers given", async () => {
    renderCard({
      onAddBefore: () => {},
      onAddAfter: () => {},
      canInsert: false,
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Stage actions"));
    });
    const menu = within(openActionsMenu()!);
    expect(menu.getByText("Add stage before").closest("li")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(menu.getByText("Add stage after").closest("li")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("calls onAddBefore/onAddAfter from the actions menu when provided", async () => {
    const onAddBefore = vi.fn();
    const onAddAfter = vi.fn();
    renderCard({ onAddBefore, onAddAfter });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Stage actions"));
    });
    await act(async () => {
      fireEvent.click(within(openActionsMenu()!).getByText("Add stage before"));
    });
    expect(onAddBefore).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Stage actions"));
    });
    await act(async () => {
      fireEvent.click(within(openActionsMenu()!).getByText("Add stage after"));
    });
    expect(onAddAfter).toHaveBeenCalled();
  });
});
