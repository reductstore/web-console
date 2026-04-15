import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Mock } from "vitest";
import RecordPreview from "./RecordPreview";
import { Bucket, QueryOptions } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("RecordPreview", () => {
  const mockBucket = {
    createQueryLink: vi.fn(),
  } as unknown as Bucket;

  const queryOptions = new QueryOptions();
  queryOptions.head = false;
  queryOptions.strict = true;
  queryOptions.when = { "&entry_1": { $gt: 10 } };

  const defaultProps = {
    contentType: "text/plain",
    size: 1024,
    fileName: "test.txt",
    entryName: "test-entry" as string | string[],
    timestamp: 1000n,
    bucket: mockBucket,
    apiUrl: "http://localhost:8383",
    queryStart: 500n,
    queryEnd: 2000n,
    queryOptions: queryOptions,
    recordEntryName: "test-entry",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    globalThis.fetch = vi.fn();
  });

  it("should render preview card", () => {
    const { container } = render(<RecordPreview {...defaultProps} />);

    expect(container.querySelector(".recordPreviewCard")).toBeTruthy();
    expect(screen.getByText("Content Preview")).toBeInTheDocument();
  });

  it("should show hide/show toggle button", () => {
    render(<RecordPreview {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /hide preview/i }),
    ).toBeInTheDocument();
  });

  it("should toggle preview visibility", () => {
    const { container } = render(<RecordPreview {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /hide preview/i }));

    expect(
      screen.getByRole("button", { name: /show preview/i }),
    ).toBeInTheDocument();
    expect(container.querySelector(".previewContent")).toBeNull();
  });

  it("should show unsupported message for large files", () => {
    const largeFileProps = {
      ...defaultProps,
      size: 50 * 1024 * 1024,
    };

    render(<RecordPreview {...largeFileProps} />);

    expect(
      screen.getByText(/Text size exceeds 10 MB limit for preview/),
    ).toBeInTheDocument();
  });

  it("should handle image content type", () => {
    const imageProps = {
      ...defaultProps,
      contentType: "image/png",
    };

    (mockBucket.createQueryLink as Mock).mockResolvedValue("http://test-url");

    render(<RecordPreview {...imageProps} />);

    expect(mockBucket.createQueryLink).toHaveBeenCalled();
  });

  it("should handle text content type", async () => {
    const textProps = {
      ...defaultProps,
      contentType: "text/plain",
    };

    (mockBucket.createQueryLink as Mock).mockResolvedValue("http://test-url");
    (globalThis.fetch as Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("test content"),
    });

    render(<RecordPreview {...textProps} />);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("http://test-url", {
        signal: expect.any(AbortSignal),
      });
    });
  });

  it("should pass query context to createQueryLink", async () => {
    (mockBucket.createQueryLink as Mock).mockResolvedValue("http://test-url");
    (globalThis.fetch as Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("test content"),
    });

    render(<RecordPreview {...defaultProps} />);

    await waitFor(() => {
      expect(mockBucket.createQueryLink).toHaveBeenCalledWith(
        "test-entry",
        500n,
        2000n,
        queryOptions,
        { entry: "test-entry", timestamp: 1000n },
        expect.any(Date),
        "test.txt",
        "http://localhost:8383",
      );
    });
  });

  it("should fall back to timestamp and index 0 when no query context", async () => {
    const propsWithoutContext = {
      contentType: "text/plain",
      size: 1024,
      fileName: "test.txt",
      entryName: "test-entry" as string | string[],
      timestamp: 1000n,
      bucket: mockBucket,
      apiUrl: "http://localhost:8383",
    };

    (mockBucket.createQueryLink as Mock).mockResolvedValue("http://test-url");
    (globalThis.fetch as Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("test content"),
    });

    render(<RecordPreview {...propsWithoutContext} />);

    await waitFor(() => {
      expect(mockBucket.createQueryLink).toHaveBeenCalledWith(
        "test-entry",
        1000n,
        undefined,
        undefined,
        { entry: "test-entry", timestamp: 1000n },
        expect.any(Date),
        "test.txt",
        "http://localhost:8383",
      );
    });
  });

  it("should show error on fetch failure", async () => {
    (mockBucket.createQueryLink as Mock).mockRejectedValue(
      new Error("Network error"),
    );

    render(<RecordPreview {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
