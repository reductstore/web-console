import React from "react";
import { render, fireEvent } from "@testing-library/react";
import BulkRemoveConfirmationModal from "./BulkRemoveConfirmationModal";
import { mockJSDOM } from "../Helpers/TestHelpers";

describe("BulkRemoveConfirmationModal", () => {
  beforeEach(() => {
    mockJSDOM();
  });

  it("should render with correct title for multiple items", () => {
    const { getByText } = render(
      <BulkRemoveConfirmationModal
        count={5}
        resourceType="bucket"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText("Remove 5 buckets?")).toBeInTheDocument();
  });

  it("should render singular for 1 item", () => {
    const { getByText } = render(
      <BulkRemoveConfirmationModal
        count={1}
        resourceType="token"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(getByText("Remove 1 token?")).toBeInTheDocument();
  });

  it("should disable confirm button until DELETE is typed", () => {
    const { getByTestId, getByText } = render(
      <BulkRemoveConfirmationModal
        count={3}
        resourceType="entry"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const removeBtn = getByText("Remove").closest("button");
    expect(removeBtn).toHaveAttribute("disabled");

    const input = getByTestId("bulk-confirm-input");
    fireEvent.change(input, { target: { value: "DELETE" } });

    expect(removeBtn).not.toHaveAttribute("disabled");
  });

  it("should call onConfirm when confirmed", () => {
    const onConfirm = vi.fn();
    const { getByTestId, getByText } = render(
      <BulkRemoveConfirmationModal
        count={2}
        resourceType="bucket"
        open={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const input = getByTestId("bulk-confirm-input");
    fireEvent.change(input, { target: { value: "DELETE" } });

    const removeBtn = getByText("Remove").closest("button")!;
    fireEvent.click(removeBtn);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("should call onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    const { getByText } = render(
      <BulkRemoveConfirmationModal
        count={2}
        resourceType="bucket"
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("should show error message when provided", () => {
    const { getByText } = render(
      <BulkRemoveConfirmationModal
        count={2}
        resourceType="bucket"
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="Something went wrong"
      />,
    );
    expect(getByText("Something went wrong")).toBeInTheDocument();
  });
});
