import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DebouncedButton from "./DebouncedButton";

describe("DebouncedButton", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders with correct text", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton onClick={mockOnClick}>Test Button</DebouncedButton>,
    );

    expect(screen.getByText("Test Button")).toBeInTheDocument();
  });

  it("calls onClick immediately when clicked", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton onClick={mockOnClick}>Test Button</DebouncedButton>,
    );

    const button = screen.getByText("Test Button");
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("disables button during debounce period", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton onClick={mockOnClick} debounceMs={300}>
        Test Button
      </DebouncedButton>,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(button).toBeDisabled();

    jest.advanceTimersByTime(300);

    expect(button).not.toBeDisabled();
  });

  it("prevents multiple clicks during debounce period", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton onClick={mockOnClick} debounceMs={300}>
        Test Button
      </DebouncedButton>,
    );

    const button = screen.getByText("Test Button");

    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("respects external disabled prop", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton onClick={mockOnClick} disabled>
        Test Button
      </DebouncedButton>,
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it("passes through other button props", () => {
    const mockOnClick = jest.fn();
    render(
      <DebouncedButton
        onClick={mockOnClick}
        type="primary"
        danger
        data-testid="test-button"
      >
        Test Button
      </DebouncedButton>,
    );

    const button = screen.getByTestId("test-button");
    expect(button).toHaveClass("ant-btn-primary");
    expect(button).toHaveClass("ant-btn-dangerous");
  });
});
