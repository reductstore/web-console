import React from "react";
import { render, fireEvent } from "@testing-library/react";
import RenameModal from "./RenameModal";

describe("RenameModal", () => {
  const mockOnRename = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the modal with the correct title", () => {
    const { getByText } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    expect(getByText('Rename bucket "test-bucket"?')).toBeInTheDocument();
  });

  it("should display the initial name in the input field", () => {
    const { getByTestId } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("rename-input") as HTMLInputElement;
    expect(input.value).toBe("test-bucket");
  });

  it("should update the input field when typed into", () => {
    const { getByTestId } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("rename-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "new-bucket-name" } });
    expect(input.value).toBe("new-bucket-name");
  });

  it("should call onRename with the new name when the save button is clicked", () => {
    const { getByTestId, getByText } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("rename-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "new-bucket-name" } });
    fireEvent.click(getByText("Save"));
    expect(mockOnRename).toHaveBeenCalledWith("new-bucket-name");
  });

  it("should call onCancel and reset the input field when the cancel button is clicked", () => {
    const { getByTestId, getByText } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("rename-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "another-bucket-name" } });
    fireEvent.click(getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
    expect(input.value).toBe("test-bucket");
  });

  it("should display an error message if errorMessage is provided", () => {
    const { getByTestId } = render(
      <RenameModal
        name="test-bucket"
        onRename={mockOnRename}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
        errorMessage="An error occurred"
      />,
    );

    const alert = getByTestId("error-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("An error occurred");
  });
});
