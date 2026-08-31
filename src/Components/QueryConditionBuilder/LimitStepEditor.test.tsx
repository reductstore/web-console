import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LimitStepEditor from "./LimitStepEditor";

describe("LimitStepEditor", () => {
  it("shows the current count", () => {
    render(<LimitStepEditor step={{ count: 100 }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("max records")).toHaveValue("100");
  });

  it("shows an empty field when count is unset", () => {
    render(<LimitStepEditor step={{ count: undefined }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("max records")).toHaveValue("");
  });

  it("reports a typed count as a number", () => {
    const onChange = vi.fn();
    render(<LimitStepEditor step={{ count: undefined }} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText("max records"), {
      target: { value: "50" },
    });
    expect(onChange).toHaveBeenCalledWith({ count: 50 });
  });
});
