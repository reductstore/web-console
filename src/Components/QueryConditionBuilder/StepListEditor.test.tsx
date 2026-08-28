import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import StepListEditor from "./StepListEditor";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { QuerySteps } from "../../Helpers/conditionalQueryBuilder";

beforeEach(() => {
  mockJSDOM();
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const noop = () => {};

const openAddStepMenu = async () => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Add step"));
  });
};

describe("StepListEditor", () => {
  it("hides everything until a bucket and entry are selected", () => {
    render(
      <StepListEditor
        steps={{
          sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
        }}
        sourceReady={false}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    expect(screen.queryByText("Sample")).toBeNull();
    expect(screen.getByLabelText("Add step")).toBeDisabled();
  });

  it("renders no step rows when steps is empty", () => {
    render(
      <StepListEditor
        steps={{}}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    expect(screen.queryByText("Sample")).toBeNull();
    expect(screen.queryByText("Limit")).toBeNull();
    expect(screen.getByLabelText("Add step")).not.toBeDisabled();
  });

  it("renders the sample step when present", () => {
    const steps: QuerySteps = {
      sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
    };
    render(
      <StepListEditor
        steps={steps}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    expect(screen.getByText("Sample")).toBeTruthy();
  });

  it("renders the limit step when present", () => {
    const steps: QuerySteps = { limit: { count: 100 } };
    render(
      <StepListEditor
        steps={steps}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    expect(screen.getByText("Limit")).toBeTruthy();
  });

  it("disables the add-step button once both steps are present", () => {
    const steps: QuerySteps = {
      sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
      limit: { count: 100 },
    };
    render(
      <StepListEditor
        steps={steps}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    expect(screen.getByLabelText("Add step")).toBeDisabled();
  });

  it("removes an already-added step from the menu instead of just disabling it", async () => {
    const steps: QuerySteps = { limit: { count: 100 } };
    render(
      <StepListEditor
        steps={steps}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    await openAddStepMenu();
    expect(screen.queryByRole("menuitem", { name: "Limit" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Sample" })).toBeTruthy();
  });

  it("calls onAddSample when Sample is picked from the menu", async () => {
    const onAddSample = vi.fn();
    render(
      <StepListEditor
        steps={{}}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={onAddSample}
        onAddLimit={noop}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Sample"));
    });
    expect(onAddSample).toHaveBeenCalled();
  });

  it("calls onAddLimit when Limit is picked from the menu", async () => {
    const onAddLimit = vi.fn();
    render(
      <StepListEditor
        steps={{}}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={onAddLimit}
        onRemoveSample={noop}
        onRemoveLimit={noop}
      />,
    );
    await openAddStepMenu();
    await act(async () => {
      fireEvent.click(screen.getByText("Limit"));
    });
    expect(onAddLimit).toHaveBeenCalled();
  });

  it("calls onRemoveSample from the sample row's remove button", () => {
    const onRemoveSample = vi.fn();
    const steps: QuerySteps = {
      sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
    };
    render(
      <StepListEditor
        steps={steps}
        onChangeSample={noop}
        onChangeLimit={noop}
        onAddSample={noop}
        onAddLimit={noop}
        onRemoveSample={onRemoveSample}
        onRemoveLimit={noop}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove sample step"));
    expect(onRemoveSample).toHaveBeenCalled();
  });
});
