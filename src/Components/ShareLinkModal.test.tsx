import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import ShareLinkModal from "./ShareLinkModal";
import RenameModal from "./RenameModal";

describe("ShareLinkModal", () => {
  const mockOnGenerate = jest.fn();
  const mockOnCancel = jest.fn();
  const record = {
    key: 0,
    contentType: "application/octet-stream",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("should render the modal with the correct title", () => {
    const { getByText } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    expect(
      getByText('Create shareable link for "test-entry"'),
    ).toBeInTheDocument();
  });

  it("should display default filename and expiry", () => {
    const { getByTestId } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    const filenameInput = getByTestId("filename-input") as HTMLInputElement;
    expect(filenameInput.value).toBe("test-entry-0.bin");

    const expiryInput = getByTestId("expiry-input");
    expect(expiryInput).toBeInTheDocument();
  });

  it("should call onGenerate and display the link", async () => {
    mockOnGenerate.mockResolvedValue("http://test-link");

    const { getByText, getByTestId } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    fireEvent.click(getByText("Generate Link"));

    await waitFor(() => {
      expect(mockOnGenerate).toHaveBeenCalled();
      expect(getByTestId("generated-link")).toHaveValue("http://test-link");
    });
  });

  it("should reset state and call onCancel when Cancel is clicked", () => {
    const { getByText } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    fireEvent.click(getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should display an error message if errorMessage is provided", () => {
    const { getByTestId } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        errorMessage="Something went wrong"
        record={record}
      />,
    );

    const alert = getByTestId("error-alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("Something went wrong");
  });
});
