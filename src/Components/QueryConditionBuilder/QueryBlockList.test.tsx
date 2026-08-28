import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import QueryBlockList from "./QueryBlockList";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { FlatCondition, Step } from "../../Helpers/conditionalQueryBuilder";

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

const noop = () => {};

const condition = (id: string): FlatCondition => ({
  id,
  label: "status",
  operator: "$eq",
  value: "active",
  negated: false,
  connector: "$and",
});

const sampleStep: Step = {
  id: "sample-1",
  type: "sample",
  sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
};
const limitStep: Step = {
  id: "limit-1",
  type: "limit",
  limit: { count: 100 },
};

const baseProps = {
  onChangeCondition: noop,
  onRemoveCondition: noop,
  onAddCondition: noop,
  onChangeSample: noop,
  onChangeLimit: noop,
  onAddSample: noop,
  onAddLimit: noop,
  onAddConditionsBlock: noop,
  onRemoveConditionsBlock: noop,
  onRemoveStep: noop,
  onReorderBlock: noop,
};

const openAddStepMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Add step"));
  });
};

describe("QueryBlockList", () => {
  it("renders nothing until a block has been added", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
      />,
    );
    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
  });

  it("renders the Where labels block with a drag handle and a remove button once added", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions"]}
        conditions={[condition("a")]}
        steps={[]}
      />,
    );
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(1);
    expect(screen.getByLabelText("Remove where labels")).toBeTruthy();
  });

  it("calls onRemoveConditionsBlock from the Where labels block's remove button", () => {
    const onRemoveConditionsBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions"]}
        conditions={[condition("a")]}
        steps={[]}
        onRemoveConditionsBlock={onRemoveConditionsBlock}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove where labels"));
    expect(onRemoveConditionsBlock).toHaveBeenCalled();
  });

  it("renders Sample and Limit as their own draggable blocks", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "sample-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[sampleStep, limitStep]}
      />,
    );
    expect(screen.getByText("Sample")).toBeTruthy();
    expect(screen.getByText("Limit")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(3);
  });

  it("hides every block until a data source is selected, but keeps Add step reachable", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "sample-1"]}
        conditions={[condition("a")]}
        steps={[sampleStep]}
        sourceReady={false}
      />,
    );
    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.queryByText("Sample")).toBeNull();
    expect(screen.getByLabelText("Add step")).toBeDisabled();
  });

  it("calls onRemoveStep with a step's id from its block's remove button", () => {
    const onRemoveStep = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["limit-1"]}
        conditions={[]}
        steps={[limitStep]}
        onRemoveStep={onRemoveStep}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove limit step"));
    expect(onRemoveStep).toHaveBeenCalledWith("limit-1");
  });

  it("offers Where labels in the Add step menu when it hasn't been added yet", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["sample-1"]}
        conditions={[]}
        steps={[sampleStep]}
      />,
    );
    await openAddStepMenu();
    expect(screen.getByRole("menuitem", { name: "Where labels" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Sample" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Limit" })).toBeTruthy();
  });

  it("removes Where labels from the menu once it's already added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions"]}
        conditions={[condition("a")]}
        steps={[]}
      />,
    );
    await openAddStepMenu();
    expect(screen.queryByRole("menuitem", { name: "Where labels" })).toBeNull();
  });

  it("calls onAddConditionsBlock when Where labels is picked from the menu", async () => {
    const onAddConditionsBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
        onAddConditionsBlock={onAddConditionsBlock}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Where labels"));
    });
    expect(onAddConditionsBlock).toHaveBeenCalled();
  });

  it("disables Add step only once Where labels, Sample, and Limit are all present", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "sample-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[sampleStep, limitStep]}
      />,
    );
    expect(screen.getByLabelText("Add step")).toBeDisabled();
  });

  it("calls onReorderBlock with the resolved from/to indexes when a block is dragged over another", () => {
    const onReorderBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "sample-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[sampleStep, limitStep]}
        onReorderBlock={onReorderBlock}
      />,
    );
    capturedOnDragEnd?.({
      active: { id: "conditions" },
      over: { id: "limit-1" },
    } as DragEndEvent);
    expect(onReorderBlock).toHaveBeenCalledWith(0, 2);
  });
});
