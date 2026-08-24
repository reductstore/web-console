import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import LabelConditionEditor from "./LabelConditionEditor";
import { LabelCondition } from "../../Helpers/conditionalQueryBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeEach(() => mockJSDOM());

const condition: LabelCondition = {
  kind: "condition",
  id: "cond-1",
  label: "status",
  operator: "$eq",
  value: "active",
};

describe("LabelConditionEditor", () => {
  it("renders the label and value of the condition", () => {
    render(
      <LabelConditionEditor
        condition={condition}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    const [labelInput] = screen.getAllByRole("combobox");
    expect(labelInput).toHaveValue("status");
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("reports label changes without the leading &", () => {
    const onChange = vi.fn();
    render(
      <LabelConditionEditor
        condition={condition}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const [labelInput] = screen.getAllByRole("combobox");
    fireEvent.change(labelInput, { target: { value: "&method" } });
    expect(onChange).toHaveBeenCalledWith("cond-1", { label: "method" });
  });

  it("suggests labels from the labelOptions prop", () => {
    render(
      <LabelConditionEditor
        condition={{ ...condition, label: "" }}
        onChange={() => {}}
        onRemove={() => {}}
        labelOptions={["status", "method"]}
      />,
    );
    const [labelInput] = screen.getAllByRole("combobox");
    fireEvent.mouseDown(labelInput);
    expect(screen.getByTitle("method")).toBeTruthy();
  });

  it("reports value changes on the value field, not the label", () => {
    const onChange = vi.fn();
    render(
      <LabelConditionEditor
        condition={condition}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "200" },
    });
    expect(onChange).toHaveBeenCalledWith("cond-1", { value: "200" });
  });

  it("calls onRemove with the condition id when the close button is clicked", () => {
    const onRemove = vi.fn();
    render(
      <LabelConditionEditor
        condition={condition}
        onChange={() => {}}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove condition"));
    expect(onRemove).toHaveBeenCalledWith("cond-1");
  });

  it("hides the remove button when removable is false", () => {
    render(
      <LabelConditionEditor
        condition={condition}
        onChange={() => {}}
        onRemove={() => {}}
        removable={false}
      />,
    );
    expect(screen.queryByLabelText("Remove condition")).toBeNull();
  });

  it("changes the operator through the select dropdown", () => {
    const onChange = vi.fn();
    const { container } = render(
      <LabelConditionEditor
        condition={condition}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const operatorSelect = container.querySelector(
      ".ant-select:not(.ant-select-auto-complete)",
    ) as HTMLElement;
    fireEvent.mouseDown(operatorSelect);
    fireEvent.click(screen.getByTitle("$gt"));
    expect(onChange).toHaveBeenCalledWith("cond-1", { operator: "$gt" });
  });

  it("renders a tags input showing each value for $in/$nin", () => {
    render(
      <LabelConditionEditor
        condition={{
          ...condition,
          operator: "$in",
          value: ["active", "inactive"],
        }}
        onChange={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText("active")).toBeTruthy();
    expect(screen.getByText("inactive")).toBeTruthy();
    expect(screen.queryByPlaceholderText("value")).toBeNull();
  });

  it("reports an array of values typed into the $in tags input", () => {
    const onChange = vi.fn();
    render(
      <LabelConditionEditor
        condition={{ ...condition, operator: "$in", value: [] }}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const [, , valueInput] = screen.getAllByRole("combobox");
    fireEvent.change(valueInput, { target: { value: "POST," } });
    expect(onChange).toHaveBeenCalledWith("cond-1", { value: ["POST"] });
  });

  it("converts the value to an array when switching to $in", () => {
    const onChange = vi.fn();
    const { container } = render(
      <LabelConditionEditor
        condition={condition}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const operatorSelect = container.querySelector(
      ".ant-select:not(.ant-select-auto-complete)",
    ) as HTMLElement;
    fireEvent.mouseDown(operatorSelect);
    fireEvent.click(screen.getByTitle("$in"));
    expect(onChange).toHaveBeenCalledWith("cond-1", {
      operator: "$in",
      value: ["active"],
    });
  });

  it("converts the value back to a single string when switching away from $in", () => {
    const onChange = vi.fn();
    const { container } = render(
      <LabelConditionEditor
        condition={{ ...condition, operator: "$in", value: ["POST", "DELETE"] }}
        onChange={onChange}
        onRemove={() => {}}
      />,
    );
    const operatorSelect = container.querySelector(
      ".ant-select:not(.ant-select-auto-complete)",
    ) as HTMLElement;
    fireEvent.mouseDown(operatorSelect);
    fireEvent.click(screen.getByTitle("$eq"));
    expect(onChange).toHaveBeenCalledWith("cond-1", {
      operator: "$eq",
      value: "POST",
    });
  });
});
