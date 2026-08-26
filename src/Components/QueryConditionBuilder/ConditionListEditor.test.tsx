import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ConditionListEditor from "./ConditionListEditor";
import { FlatCondition } from "../../Helpers/conditionalQueryBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeEach(() => mockJSDOM());

const condition = (
  id: string,
  overrides: Partial<FlatCondition> = {},
): FlatCondition => ({
  id,
  label: overrides.label ?? "",
  operator: overrides.operator ?? "$eq",
  value: overrides.value ?? "",
  negated: overrides.negated ?? false,
  connector: overrides.connector ?? "$and",
});

const noop = () => {};

describe("ConditionListEditor", () => {
  it("renders one row per condition without a connector for a single item", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    expect(screen.getAllByPlaceholderText("value")).toHaveLength(1);
    expect(screen.queryByText("and")).toBeNull();
    expect(screen.queryByText("not")).toBeNull();
  });

  it("shows a connector before every item after the first", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a"), condition("b"), condition("c")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    expect(screen.getAllByText("and")).toHaveLength(2);
    expect(screen.getAllByPlaceholderText("value")).toHaveLength(3);
  });

  it("calls onAddCondition when + is clicked and the last row is complete", () => {
    const onAddCondition = vi.fn();
    render(
      <ConditionListEditor
        conditions={[condition("a", { label: "status", value: "active" })]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={onAddCondition}
      />,
    );
    fireEvent.click(screen.getByLabelText("Add condition"));
    expect(onAddCondition).toHaveBeenCalled();
  });

  it("disables + until the last row has both a label and a value", () => {
    const onAddCondition = vi.fn();
    render(
      <ConditionListEditor
        conditions={[condition("a")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={onAddCondition}
      />,
    );
    fireEvent.click(screen.getByLabelText("Add condition"));
    expect(onAddCondition).not.toHaveBeenCalled();
  });

  it("hides every row and disables + until a data source is selected", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
        sourceReady={false}
      />,
    );
    expect(screen.queryByPlaceholderText("value")).toBeNull();
    expect(screen.getByLabelText("Add condition")).toBeDisabled();
  });

  it("hides every remove button when only one condition remains", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    expect(screen.queryByLabelText("Remove condition")).toBeNull();
  });

  it("shows remove buttons for every condition once there are 2+", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a"), condition("b")]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    expect(screen.getAllByLabelText("Remove condition")).toHaveLength(2);
  });

  it("reports connector changes with the condition id", () => {
    const onChangeCondition = vi.fn();
    const { container } = render(
      <ConditionListEditor
        conditions={[condition("a"), condition("b")]}
        onChangeCondition={onChangeCondition}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    // The connector select is the first plain (non-autocomplete) select in
    // the row for the 2nd condition, after the 1st condition's own operator
    // select.
    const [, connectorSelect] = container.querySelectorAll(
      ".ant-select:not(.ant-select-auto-complete)",
    );
    fireEvent.mouseDown(connectorSelect as HTMLElement);
    fireEvent.click(screen.getByTitle("or"));
    expect(onChangeCondition).toHaveBeenCalledWith("b", {
      connector: "$or",
      negated: false,
    });
  });

  it("selecting not sets connector to and and negates the condition", () => {
    const onChangeCondition = vi.fn();
    const { container } = render(
      <ConditionListEditor
        conditions={[condition("a"), condition("b", { connector: "$or" })]}
        onChangeCondition={onChangeCondition}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    const [, connectorSelect] = container.querySelectorAll(
      ".ant-select:not(.ant-select-auto-complete)",
    );
    fireEvent.mouseDown(connectorSelect as HTMLElement);
    fireEvent.click(screen.getByTitle("not"));
    expect(onChangeCondition).toHaveBeenCalledWith("b", {
      connector: "$and",
      negated: true,
    });
  });

  it("shows not as the connector when the condition is already negated", () => {
    render(
      <ConditionListEditor
        conditions={[condition("a"), condition("b", { negated: true })]}
        onChangeCondition={noop}
        onRemoveCondition={noop}
        onAddCondition={noop}
      />,
    );
    expect(screen.getByText("not")).toBeTruthy();
  });
});
