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
  onSwitchKind: vi.fn(),
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

  it("shows the resolved interval value in the duration field while using the macro", () => {
    render(
      <SampleStepEditor
        {...eachTProps}
        useIntervalMacro={true}
        intervalValue="30s"
      />,
    );
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveValue(
      "30s",
    );
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

  it("calls onSwitchKind when a different kind is picked", () => {
    const onSwitchKind = vi.fn();
    render(<SampleStepEditor {...eachTProps} onSwitchKind={onSwitchKind} />);
    fireEvent.click(screen.getByText("By record count"));
    expect(onSwitchKind).toHaveBeenCalledWith("each_n");
  });

  it("disables the kind switch when switchDisabled is true", () => {
    render(<SampleStepEditor {...eachTProps} switchDisabled />);
    expect(screen.getByText("By record count").closest("label")).toHaveClass(
      "ant-segmented-item-disabled",
    );
  });

  it("flags a malformed duration as an error", () => {
    render(<SampleStepEditor {...eachTProps} duration="not-a-duration" />);
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveClass(
      "ant-input-status-error",
    );
  });

  it("does not flag a blank duration as an error", () => {
    render(<SampleStepEditor {...eachTProps} duration="" />);
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).not.toHaveClass(
      "ant-input-status-error",
    );
  });

  it("does not flag a valid duration as an error", () => {
    render(<SampleStepEditor {...eachTProps} duration="1d 2h" />);
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).not.toHaveClass(
      "ant-input-status-error",
    );
  });

  it("does not flag the field as an error while using the interval macro, even if the typed duration was invalid", () => {
    render(
      <SampleStepEditor
        {...eachTProps}
        useIntervalMacro={true}
        duration="not-a-duration"
        intervalValue="30s"
      />,
    );
    expect(screen.getByPlaceholderText("duration (e.g. 30s)")).not.toHaveClass(
      "ant-input-status-error",
    );
  });
});
