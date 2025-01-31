import React from "react";
import { render, fireEvent } from "@testing-library/react";
import RemoveConfirmationModal from "./RemoveConfirmationModal";
import { mockJSDOM } from "../Helpers/TestHelpers";

describe("RemoveConfirmationModal", () => {
  const mockOnRemove = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  it("should render the modal with the correct title", () => {
    const { getByText } = render(
      <RemoveConfirmationModal
        name="test-bucket"
        onRemove={mockOnRemove}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );
    expect(getByText('Remove bucket "test-bucket"?')).toBeInTheDocument();
  });

  it("should enable the remove button when the correct name is typed", () => {
    const { getByTestId, getByText } = render(
      <RemoveConfirmationModal
        name="test-bucket"
        onRemove={mockOnRemove}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("confirm-input");
    fireEvent.change(input, { target: { value: "test-bucket" } });

    expect(getByText("Remove").closest("button")).not.toHaveAttribute(
      "disabled",
    );
  });

  it("should disable the remove button when the incorrect name is typed", () => {
    const { getByTestId, getByText } = render(
      <RemoveConfirmationModal
        name="test-bucket"
        onRemove={mockOnRemove}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("confirm-input");
    fireEvent.change(input, { target: { value: "wrong-name" } });

    expect(getByText("Remove").closest("button")).toHaveClass(
      "ant-btn-loading",
    );
  });

  it("should call onRemove when the remove button is clicked", () => {
    const { getByTestId, getByText } = render(
      <RemoveConfirmationModal
        name="test-bucket"
        onRemove={mockOnRemove}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    const input = getByTestId("confirm-input");
    fireEvent.change(input, { target: { value: "test-bucket" } });

    fireEvent.click(getByText("Remove"));
    expect(mockOnRemove).toHaveBeenCalled();
  });

  it("should call onCancel when the cancel button is clicked", () => {
    const { getByText } = render(
      <RemoveConfirmationModal
        name="test-bucket"
        onRemove={mockOnRemove}
        onCancel={mockOnCancel}
        resourceType="bucket"
        open={true}
      />,
    );

    fireEvent.click(getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
