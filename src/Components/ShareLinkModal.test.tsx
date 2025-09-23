import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import ShareLinkModal from "./ShareLinkModal";

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

  it("should highlight the default preset (24h)", () => {
    const { getByTestId } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    const btn24h = getByTestId("preset-24h");
    expect(btn24h).toHaveAttribute("type", "button");
    expect(btn24h).toHaveClass("ant-btn-primary", { exact: false });
  });

  it("should switch active preset when clicking another button", () => {
    const { getByTestId } = render(
      <ShareLinkModal
        open={true}
        entryName="test-entry"
        onGenerate={mockOnGenerate}
        onCancel={mockOnCancel}
        record={record}
      />,
    );

    const btn6h = getByTestId("preset-6h");
    fireEvent.click(btn6h);

    expect(btn6h).toHaveClass("ant-btn-primary", { exact: false });
    expect(getByTestId("preset-24h")).not.toHaveClass("ant-btn-primary", {
      exact: false,
    });
  });

  it("should copy the link to clipboard when copy button is clicked", async () => {
    mockOnGenerate.mockResolvedValue("http://test-link");
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

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
      expect(getByTestId("generated-link")).toHaveValue("http://test-link");
    });

    fireEvent.click(getByTestId("copy-button"));

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith("http://test-link");
    });
  });

  it("should render an open button with correct href after generating link", async () => {
    mockOnGenerate.mockResolvedValue("http://test-link");

    const { getByText, getByRole } = render(
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
      const openButton = getByRole("link", { name: /Open/i });
      expect(openButton).toHaveAttribute("href", "http://test-link");
      expect(openButton).toHaveAttribute("target", "_blank");
      expect(openButton).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});
