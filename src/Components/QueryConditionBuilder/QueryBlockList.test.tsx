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

const eachNStep: Step = {
  id: "each-n-1",
  type: "each_n",
  eachN: { everyNth: 2 },
};
const eachTStep: Step = {
  id: "each-t-1",
  type: "each_t",
  eachT: { duration: "", useIntervalMacro: true },
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
  onChangeEachN: noop,
  onChangeEachT: noop,
  onChangeLimit: noop,
  onAddSample: noop,
  onSwitchSampleKind: noop,
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

  it("renders each_n and each_t as two separate Sample blocks, plus Limit", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-n-1", "each-t-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[eachNStep, eachTStep, limitStep]}
      />,
    );
    expect(screen.getAllByText("Sample")).toHaveLength(2);
    expect(screen.getByText("Limit")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(4);
    expect(screen.getAllByLabelText("Remove sample step")).toHaveLength(2);
  });

  it("hides every block until a data source is selected, but keeps Add step reachable", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-t-1"]}
        conditions={[condition("a")]}
        steps={[eachTStep]}
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

  it("offers Where labels, Sample, and Limit in the Add step menu when none has been added yet", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
      />,
    );
    await openAddStepMenu();
    expect(screen.getByRole("menuitem", { name: "Where labels" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Sample" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Limit" })).toBeTruthy();
  });

  it("keeps offering Sample in the menu when only one kind has been added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-t-1"]}
        conditions={[]}
        steps={[eachTStep]}
      />,
    );
    await openAddStepMenu();
    expect(screen.getByRole("menuitem", { name: "Sample" })).toBeTruthy();
  });

  it("removes Sample from the menu once both kinds are already added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-n-1", "each-t-1"]}
        conditions={[]}
        steps={[eachNStep, eachTStep]}
      />,
    );
    await openAddStepMenu();
    expect(screen.queryByRole("menuitem", { name: "Sample" })).toBeNull();
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

  it("calls onAddSample when Sample is picked from the menu", async () => {
    const onAddSample = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
        onAddSample={onAddSample}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Sample"));
    });
    expect(onAddSample).toHaveBeenCalled();
  });

  it("locks the kind switch on both Sample blocks once both kinds are present", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-n-1", "each-t-1"]}
        conditions={[]}
        steps={[eachNStep, eachTStep]}
      />,
    );
    const disabledSegments = document.querySelectorAll(
      ".ant-segmented-disabled",
    );
    expect(disabledSegments).toHaveLength(2);
  });

  it("leaves the kind switch enabled when only one Sample block is present", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-t-1"]}
        conditions={[]}
        steps={[eachTStep]}
      />,
    );
    expect(document.querySelector(".ant-segmented-disabled")).toBeNull();
  });

  it("disables Add step only once every block type is present", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-n-1", "each-t-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[eachNStep, eachTStep, limitStep]}
      />,
    );
    expect(screen.getByLabelText("Add step")).toBeDisabled();
  });

  it("keeps Add step enabled when only some block types are present", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-n-1"]}
        conditions={[condition("a")]}
        steps={[eachNStep]}
      />,
    );
    expect(screen.getByLabelText("Add step")).not.toBeDisabled();
  });

  it("calls onReorderBlock with the resolved from/to indexes when a block is dragged over another", () => {
    const onReorderBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-t-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[eachTStep, limitStep]}
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
