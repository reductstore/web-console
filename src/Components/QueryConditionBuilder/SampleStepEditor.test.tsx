import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SampleStepEditor from "./SampleStepEditor";

const eachTProps = {
  kind: "each_t" as const,
  everyNth: undefined,
  duration: "",
  useIntervalMacro: false,
  onChangeEachN: vi.fn(),
  onChangeEachT: vi.fn(),
};

const eachNProps = {
  ...eachTProps,
  kind: "each_n" as const,
  everyNth: undefined,
};

describe("SampleStepEditor", () => {
  it("shows the current duration", () => {
    render(<SampleStepEditor {...eachTProps} duration="30s" />);
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveValue(
      "30s",
    );
  });

  it("shows the literal $__interval macro in the duration field while using the macro", () => {
    render(
      <SampleStepEditor
        {...eachTProps}
        useIntervalMacro={true}
        intervalValue="30s"
      />,
    );
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveValue(
      "$__interval",
    );
  });

  it("shows the resolved interval value next to the input while using the macro", () => {
    render(
      <SampleStepEditor
        {...eachTProps}
        useIntervalMacro={true}
        intervalValue="30s"
      />,
    );
    expect(screen.getByText("resolves to 30s")).toBeTruthy();
  });

  it("does not show the resolved interval value when not using the macro", () => {
    render(
      <SampleStepEditor {...eachTProps} duration="30s" intervalValue="30s" />,
    );
    expect(screen.queryByText(/resolves to/)).toBeNull();
  });

  it("reports a typed duration and switches off the interval macro", () => {
    const onChangeEachT = vi.fn();
    render(<SampleStepEditor {...eachTProps} onChangeEachT={onChangeEachT} />);
    fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
      target: { value: "1m" },
    });
    expect(onChangeEachT).toHaveBeenCalledWith({
      duration: "1m",
      useIntervalMacro: false,
    });
  });

  it("shows a plain number field for each_n and reports a typed count", () => {
    const onChangeEachN = vi.fn();
    render(<SampleStepEditor {...eachNProps} onChangeEachN={onChangeEachN} />);
    fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
      target: { value: "5" },
    });
    expect(onChangeEachN).toHaveBeenCalledWith({ everyNth: 5 });
  });
});
