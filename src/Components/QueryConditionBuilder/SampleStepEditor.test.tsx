import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SampleStepEditor from "./SampleStepEditor";
import { SampleStep } from "../../Helpers/conditionalQueryBuilder";

const eachTStep = (overrides: Partial<SampleStep> = {}): SampleStep => ({
  kind: "$each_t",
  duration: "",
  useIntervalMacro: false,
  ...overrides,
});

const eachNStep = (overrides: Partial<SampleStep> = {}): SampleStep => ({
  kind: "$each_n",
  everyNth: undefined,
  duration: "",
  useIntervalMacro: false,
  ...overrides,
});

describe("SampleStepEditor", () => {
  it("shows the current duration", () => {
    render(
      <SampleStepEditor
        step={eachTStep({ duration: "30s" })}
        onChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveValue(
      "30s",
    );
  });

  it("reports a typed duration", () => {
    const onChange = vi.fn();
    render(
      <SampleStepEditor
        step={eachTStep()}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
      target: { value: "1m" },
    });
    expect(onChange).toHaveBeenCalledWith({ duration: "1m" });
  });

  it("shows a plain number field for $each_n and reports a typed count", () => {
    const onChange = vi.fn();
    render(
      <SampleStepEditor
        step={eachNStep()}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
      target: { value: "5" },
    });
    expect(onChange).toHaveBeenCalledWith({ everyNth: 5 });
  });

  it("resets the other kind's fields when switching from $each_t to $each_n", () => {
    const onChange = vi.fn();
    render(
      <SampleStepEditor
        step={eachTStep({ duration: "30s" })}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Reduce by record count"));
    expect(onChange).toHaveBeenCalledWith({
      kind: "$each_n",
      everyNth: undefined,
      duration: "",
      useIntervalMacro: false,
    });
  });

  it("resets the other kind's fields when switching from $each_n to $each_t", () => {
    const onChange = vi.fn();
    render(
      <SampleStepEditor
        step={eachNStep({ everyNth: 5 })}
        onChange={onChange}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Reduce by time interval"));
    expect(onChange).toHaveBeenCalledWith({
      kind: "$each_t",
      everyNth: undefined,
      duration: "",
      useIntervalMacro: false,
    });
  });

  it("calls onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <SampleStepEditor
        step={eachTStep()}
        onChange={vi.fn()}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove sample step"));
    expect(onRemove).toHaveBeenCalled();
  });
});
