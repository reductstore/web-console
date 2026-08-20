import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ConditionGroupEditor from "./ConditionGroupEditor";
import {
  ConditionGroup,
  LabelCondition,
} from "../../Helpers/conditionalQueryBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeEach(() => mockJSDOM());

const condition = (id: string, label = ""): LabelCondition => ({
  kind: "condition",
  id,
  label,
  operator: "$eq",
  value: "",
});

const noop = () => {};

describe("ConditionGroupEditor", () => {
  it("renders one row per condition without a connector for a single child", () => {
    const group: ConditionGroup = {
      kind: "group",
      id: "root",
      operator: "$and",
      children: [condition("a")],
    };
    render(
      <ConditionGroupEditor
        group={group}
        isRoot
        onChangeCondition={noop}
        onChangeGroupOperator={noop}
        onRemoveNode={noop}
        onAddCondition={noop}
        onAddGroup={noop}
      />,
    );
    expect(screen.getAllByPlaceholderText("value")).toHaveLength(1);
    expect(screen.queryByText("and")).toBeNull();
  });

  it("shows the connector once there are 2+ children", () => {
    const group: ConditionGroup = {
      kind: "group",
      id: "root",
      operator: "$and",
      children: [condition("a"), condition("b")],
    };
    render(
      <ConditionGroupEditor
        group={group}
        isRoot
        onChangeCondition={noop}
        onChangeGroupOperator={noop}
        onRemoveNode={noop}
        onAddCondition={noop}
        onAddGroup={noop}
      />,
    );
    expect(screen.getByText("and")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("value")).toHaveLength(2);
  });

  it("calls onAddCondition and onAddGroup with the group id", () => {
    const onAddCondition = vi.fn();
    const onAddGroup = vi.fn();
    const group: ConditionGroup = {
      kind: "group",
      id: "root",
      operator: "$and",
      children: [condition("a")],
    };
    render(
      <ConditionGroupEditor
        group={group}
        isRoot
        onChangeCondition={noop}
        onChangeGroupOperator={noop}
        onRemoveNode={noop}
        onAddCondition={onAddCondition}
        onAddGroup={onAddGroup}
      />,
    );
    fireEvent.click(screen.getByText("+ Condition"));
    fireEvent.click(screen.getByText("+ Group (and/or/not)"));
    expect(onAddCondition).toHaveBeenCalledWith("root");
    expect(onAddGroup).toHaveBeenCalledWith("root");
  });

  it("never shows a remove button for the root's first child", () => {
    const group: ConditionGroup = {
      kind: "group",
      id: "root",
      operator: "$and",
      children: [condition("a"), condition("b")],
    };
    render(
      <ConditionGroupEditor
        group={group}
        isRoot
        onChangeCondition={noop}
        onChangeGroupOperator={noop}
        onRemoveNode={noop}
        onAddCondition={noop}
        onAddGroup={noop}
      />,
    );
    // Only the 2nd condition (index 1) may be removed; the 1st never is.
    expect(screen.getAllByLabelText("Remove condition")).toHaveLength(1);
  });

  it("renders a nested group with its own close button", () => {
    const nested: ConditionGroup = {
      kind: "group",
      id: "sub",
      operator: "$or",
      children: [condition("a")],
    };
    const group: ConditionGroup = {
      kind: "group",
      id: "root",
      operator: "$and",
      children: [condition("z"), nested],
    };
    const onRemoveNode = vi.fn();
    render(
      <ConditionGroupEditor
        group={group}
        isRoot
        onChangeCondition={noop}
        onChangeGroupOperator={noop}
        onRemoveNode={onRemoveNode}
        onAddCondition={noop}
        onAddGroup={noop}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remove group"));
    expect(onRemoveNode).toHaveBeenCalledWith("sub");
  });
});
