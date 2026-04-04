import React from "react";
import { render, screen } from "@testing-library/react";
import { DeleteOutlined } from "@ant-design/icons";
import ActionIcon from "./ActionIcon";

describe("ActionIcon", () => {
  it("does not render tooltip for enabled icon by default", () => {
    const { container } = render(
      <ActionIcon icon={<DeleteOutlined />} tooltip="Remove entry" />,
    );

    expect(container.querySelector(".ant-tooltip-open")).toBeNull();
    expect(screen.queryByText("Remove entry")).toBeNull();
  });

  it("renders tooltip wrapper when enabled and showTooltipWhenEnabled is true", () => {
    const { container } = render(
      <ActionIcon
        icon={<DeleteOutlined />}
        tooltip="Remove entry"
        showTooltipWhenEnabled
      />,
    );

    expect(container.querySelector(".ant-tooltip-open")).toBeNull();
    expect(container.querySelector("span")).toBeTruthy();
  });

  it("disables click when disabled", () => {
    const onClick = vi.fn();
    render(
      <ActionIcon
        icon={<DeleteOutlined data-testid="icon" />}
        tooltip="Busy"
        disabled
        onClick={onClick}
      />,
    );

    screen.getByTestId("icon").click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
