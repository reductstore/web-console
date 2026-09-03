import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { DragEndEvent } from "@dnd-kit/core";
import QueryBlockList from "./QueryBlockList";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { FlatCondition, Step } from "../../Helpers/conditionalQueryBuilder";
import {
  TRANSFORM_BLOCK_ID,
  TransformStepEntry,
} from "../../Helpers/transformStepBuilder";

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
  onAddEachT: noop,
  onAddEachN: noop,
  onAddLimit: noop,
  onAddConditionsBlock: noop,
  onRemoveConditionsBlock: noop,
  onAddTransformBlock: noop,
  onRemoveTransformBlock: noop,
  onAddSection: noop,
  onRemoveSection: noop,
  onChangeTopic: noop,
  onAddEncodeRow: noop,
  onChangeEncodeRow: noop,
  onRemoveEncodeRow: noop,
  onAddAsLabelRow: noop,
  onChangeAsLabelRow: noop,
  onRemoveAsLabelRow: noop,
  onChangeExport: noop,
  onRemoveStep: noop,
  onReorderBlock: noop,
};

const transformStep: TransformStepEntry = {
  kind: "ros",
  ros: {
    sections: ["filter", "label"],
    topic: "/robot/odom",
    encode: [],
    asLabel: [{ id: "row-1", key: "speed", value: "speed" }],
    export: { format: "", duration: "", size: "" },
  },
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
    expect(screen.queryByText("Label filter")).toBeNull();
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
  });

  it("renders the Label filter block with a drag handle and a remove button once added", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions"]}
        conditions={[condition("a")]}
        steps={[]}
      />,
    );
    expect(screen.getByText("Label filter")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(1);
    expect(screen.getByLabelText("Remove label filter")).toBeTruthy();
  });

  it("calls onRemoveConditionsBlock from the Label filter block's remove button", () => {
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
    fireEvent.click(screen.getByLabelText("Remove label filter"));
    expect(onRemoveConditionsBlock).toHaveBeenCalled();
  });

  it("renders each_n and each_t as two separate Sample blocks with distinct titles, plus Limit", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-n-1", "each-t-1", "limit-1"]}
        conditions={[condition("a")]}
        steps={[eachNStep, eachTStep, limitStep]}
      />,
    );
    expect(screen.getByText("Sample every N")).toBeTruthy();
    expect(screen.getByText("Sample by time")).toBeTruthy();
    expect(screen.getByText("Limit")).toBeTruthy();
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(4);
    expect(screen.getAllByLabelText("Remove sample step")).toHaveLength(2);
  });

  it("renders the Transform block with its title and remove button", () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[TRANSFORM_BLOCK_ID]}
        conditions={[]}
        steps={[]}
        transform={transformStep}
      />,
    );
    expect(screen.getByText("Process (ROS)")).toBeTruthy();
    expect(screen.getByLabelText("Remove process")).toBeTruthy();
  });

  it("calls onRemoveTransformBlock from the Transform block's remove button", () => {
    const onRemoveTransformBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[TRANSFORM_BLOCK_ID]}
        conditions={[]}
        steps={[]}
        transform={transformStep}
        onRemoveTransformBlock={onRemoveTransformBlock}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove process"));
    expect(onRemoveTransformBlock).toHaveBeenCalled();
  });

  it("offers Process (ROS) in the Add step menu, and calls onAddTransformBlock when picked", async () => {
    const onAddTransformBlock = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
        onAddTransformBlock={onAddTransformBlock}
      />,
    );
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Process (ROS)" }),
    ).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("Process (ROS)"));
    });
    expect(onAddTransformBlock).toHaveBeenCalled();
  });

  it("greys out Process (ROS) once it's already added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[TRANSFORM_BLOCK_ID]}
        conditions={[]}
        steps={[]}
        transform={transformStep}
      />,
    );
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Process (ROS)" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("hides every block until a data source is selected, but keeps Add step reachable and greys out its menu", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions", "each-t-1"]}
        conditions={[condition("a")]}
        steps={[eachTStep]}
        sourceReady={false}
      />,
    );
    expect(screen.queryByText("Label filter")).toBeNull();
    expect(screen.queryByText("Sample by time")).toBeNull();
    expect(screen.getByLabelText("Add step")).not.toBeDisabled();
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Label filter" }),
    ).toHaveAttribute("aria-disabled", "true");
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

  it("offers Label filter, both Sample kinds, Limit, and Transform in the Add step menu when none has been added yet", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
      />,
    );
    await openAddStepMenu();
    expect(screen.getByRole("menuitem", { name: "Label filter" })).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Sample by time" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Sample every N" }),
    ).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Limit" })).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Process (ROS)" }),
    ).toBeTruthy();
  });

  it("greys out only the Sample kind that's already been added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-t-1"]}
        conditions={[]}
        steps={[eachTStep]}
      />,
    );
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Sample by time" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: "Sample every N" }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("greys out both Sample menu items once both kinds are already added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["each-n-1", "each-t-1"]}
        conditions={[]}
        steps={[eachNStep, eachTStep]}
      />,
    );
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Sample by time" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("menuitem", { name: "Sample every N" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("greys out Label filter once it's already added", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={["conditions"]}
        conditions={[condition("a")]}
        steps={[]}
      />,
    );
    await openAddStepMenu();
    expect(
      screen.getByRole("menuitem", { name: "Label filter" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("calls onAddConditionsBlock when Label filter is picked from the menu", async () => {
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
      fireEvent.click(screen.getByText("Label filter"));
    });
    expect(onAddConditionsBlock).toHaveBeenCalled();
  });

  it("calls onAddEachT when Sample by time is picked from the menu", async () => {
    const onAddEachT = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
        onAddEachT={onAddEachT}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Sample by time"));
    });
    expect(onAddEachT).toHaveBeenCalled();
  });

  it("calls onAddEachN when Sample every N is picked from the menu", async () => {
    const onAddEachN = vi.fn();
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[]}
        conditions={[]}
        steps={[]}
        onAddEachN={onAddEachN}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Sample every N"));
    });
    expect(onAddEachN).toHaveBeenCalled();
  });

  it("keeps Add step enabled and greys out every item once every block type is present", async () => {
    render(
      <QueryBlockList
        {...baseProps}
        blockOrder={[
          "conditions",
          "each-n-1",
          "each-t-1",
          "limit-1",
          TRANSFORM_BLOCK_ID,
        ]}
        conditions={[condition("a")]}
        steps={[eachNStep, eachTStep, limitStep]}
        transform={transformStep}
      />,
    );
    expect(screen.getByLabelText("Add step")).not.toBeDisabled();
    await openAddStepMenu();
    for (const name of [
      "Label filter",
      "Sample by time",
      "Sample every N",
      "Limit",
      "Process (ROS)",
    ]) {
      expect(screen.getByRole("menuitem", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
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
