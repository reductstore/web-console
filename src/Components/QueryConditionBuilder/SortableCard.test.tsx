import React, { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import SortableCard from "./SortableCard";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeEach(() => mockJSDOM());

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
});
