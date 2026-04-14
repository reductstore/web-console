import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Mocked } from "vitest";
import { MockFile, mockJSDOM } from "../../Helpers/TestHelpers";
import { APIError, Bucket, Client } from "reduct-js";
import UploadFileForm from "./UploadFileForm";
import { act } from "react";
import dayjs from "dayjs";

// Mock ResizeObserver for antd DatePicker popup
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// test timeout
vi.setConfig({ testTimeout: 20000 });

function makeMockRcFile(
  testContent: string,
  name = "test.txt",
  type = "text/plain",
) {
  const file = new File([testContent], name, { type });
  Object.defineProperty(file, "uid", { value: "1" });
  return file;
}

function mockWriting(client: Client) {
  const mockWrite = vi.fn().mockResolvedValue({});

  const mockBucket = {
    getInfo: vi.fn().mockResolvedValue({}),
    beginWrite: vi.fn().mockResolvedValue({
      write: mockWrite,
    }),
  } as unknown as Mocked<Bucket>;

  client.getBucket = vi.fn().mockResolvedValue(mockBucket);
  return { mockWrite, mockBucket };
}

async function attachFile(container: HTMLElement, file: File) {
  const fileInput = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  expect(fileInput).not.toBeNull();

  await act(async () => {
    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: true,
    });
    fireEvent.change(fileInput);
  });
}

async function submitForm(container: HTMLElement) {
  const submitButton = container.querySelector(
    "button.uploadButton",
  ) as HTMLButtonElement;
  expect(submitButton).not.toBeNull();

  await act(async () => {
    fireEvent.click(submitButton);
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
}

async function addLabel(container: HTMLElement) {
  const addLabelButton = Array.from(container.querySelectorAll("button")).find(
    (btn) => btn.textContent?.includes("Add Label"),
  );
  expect(addLabelButton).toBeTruthy();

  await act(async () => {
    fireEvent.click(addLabelButton!);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
}

describe("UploadFileForm", () => {
  const client = new Client("");
  let bucket: Mocked<Bucket>;
  let container: HTMLElement;
  const mockOnUploadSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJSDOM();

    globalThis.File = MockFile as unknown as typeof File;
    bucket = {
      getInfo: vi.fn().mockResolvedValue({}),
      beginWrite: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
      }),
    } as unknown as Mocked<Bucket>;

    client.getBucket = vi.fn().mockResolvedValue(bucket);

    const result = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="testEntry"
        availableEntries={["testEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );
    ({ container } = result);
  });

  it("should successfully upload a file with default parameters", async () => {
    const testContent = "test content for verification";
    const file = makeMockRcFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="testEntry"
        availableEntries={["testEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    await attachFile(container, file);
    await submitForm(container);

    expect(client.getBucket).toHaveBeenCalledWith("testBucket");
    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "text/plain",
        labels: {},
        ts: expect.any(BigInt),
      }),
    );
    expect(Buffer.from(mockWrite.mock.calls[0][0]).toString()).toBe(
      testContent,
    );
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should successfully upload a file with all parameters set", async () => {
    const testContent = "test content with all parameters";
    const file = makeMockRcFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="testEntry"
        availableEntries={["testEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    await attachFile(container, file);

    // Set content type
    const contentTypeInput = container.querySelector(
      '[data-testid="content-type-input"]',
    ) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(contentTypeInput, {
        target: { value: "application/json" },
      });
    });

    // Add labels before interacting with DatePicker (antd's DatePicker
    // uses native events that can interfere with subsequent interactions)
    await addLabel(container);
    const labelKeyInput = container.querySelector(
      '[data-testid="label-key-input"]',
    ) as HTMLInputElement;
    expect(labelKeyInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(labelKeyInput, { target: { value: "version" } });
    });

    const labelValueInput = container.querySelector(
      '[data-testid="label-value-input"]',
    ) as HTMLInputElement;
    expect(labelValueInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(labelValueInput, { target: { value: "1.0.0" } });
    });

    // Set timestamp using dayjs - interact with DatePicker last
    const testDate = dayjs("2024-01-01T12:00:00Z");
    const timestampInput = container.querySelector(
      ".ant-picker-input input",
    ) as HTMLInputElement;
    expect(timestampInput).not.toBeNull();

    await act(async () => {
      fireEvent.mouseDown(timestampInput);
      fireEvent.focus(timestampInput);

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!;
      nativeInputValueSetter.call(
        timestampInput,
        testDate.format("YYYY-MM-DD HH:mm:ss"),
      );
      timestampInput.dispatchEvent(new Event("input", { bubbles: true }));
      timestampInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Confirm value and close the picker
      fireEvent.keyDown(timestampInput, { key: "Enter", code: "Enter" });
      fireEvent.blur(timestampInput);
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    await submitForm(container);
    expect(client.getBucket).toHaveBeenCalledWith("testBucket");

    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "application/json",
        labels: { version: "1.0.0" },
        ts: BigInt(testDate.valueOf() * 1000),
      }),
    );

    expect(Buffer.from(mockWrite.mock.calls[0][0]).toString()).toBe(
      testContent,
    );
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should show error message for communication error", async () => {
    const testContent = "test content for verification";
    const file = makeMockRcFile(testContent);
    const { mockWrite } = mockWriting(client);
    mockWrite.mockRejectedValueOnce(new APIError("test error", 400));

    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="testEntry"
        availableEntries={["testEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    await attachFile(container, file);
    await submitForm(container);

    await waitFor(() => {
      expect(screen.getByText("test error")).toBeTruthy();
    });
  });

  it("should have disabled upload button when no file is set", async () => {
    // Initially, button should be disabled
    let uploadButton = container.querySelector(
      "button.uploadButton",
    ) as HTMLButtonElement;
    expect(uploadButton).not.toBeNull();
    expect(uploadButton.disabled).toBe(true);

    // Set a file
    const testContent = "test content";
    const file = makeMockRcFile(testContent);

    await attachFile(container, file);

    // Button should now be enabled
    uploadButton = container.querySelector(
      "button.uploadButton",
    ) as HTMLButtonElement;
    expect(uploadButton.disabled).toBe(false);

    // Remove the file by changing with empty file list
    const fileInput = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await act(async () => {
      Object.defineProperty(fileInput, "files", {
        value: [],
        writable: true,
      });
      fireEvent.change(fileInput);
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // If still enabled, try clicking the remove button in the upload list
    const removeButton = container.querySelector(
      ".ant-upload-list-item-action",
    ) as HTMLElement | null;
    if (removeButton) {
      await act(async () => {
        fireEvent.click(removeButton);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    }

    await waitFor(() => {
      uploadButton = container.querySelector(
        "button.uploadButton",
      ) as HTMLButtonElement;
      expect(uploadButton.disabled).toBe(true);
    });
  });

  it("should display error message when communication error occurs during upload", async () => {
    const testContent = "test content";
    const file = makeMockRcFile(testContent);

    await attachFile(container, file);
    await addLabel(container);

    // Verify label inputs exist before interacting
    const labelItem = container.querySelector(".labelItem");
    expect(labelItem).not.toBeNull();

    // Set only the value (leaving key empty to trigger validation error)
    const labelValueInput = labelItem!.querySelector(
      'input[placeholder="Value"]',
    ) as HTMLInputElement;
    expect(labelValueInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(labelValueInput, { target: { value: "value1" } });
    });

    await submitForm(container);

    // Verify error message for invalid label key
    await waitFor(() => {
      expect(
        screen.getByText(
          "Invalid label key(s): . Keys must be alphanumeric and can include underscores or hyphens.",
        ),
      ).toBeTruthy();
    });

    // Verify upload wasn't called
    expect(client.getBucket).not.toHaveBeenCalled();
  });

  it("should have disabled entry name input when entryName prop is provided", async () => {
    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="fixedEntry"
        availableEntries={["existingEntry1", "fixedEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    // AutoComplete renders an input - check that it's disabled and has correct value
    const entryInput = container.querySelector(
      '[data-testid="entry-name-input"], .ant-select-disabled input, .ant-select-disabled',
    );
    expect(entryInput).not.toBeNull();

    // Check the select/autocomplete is disabled
    const autoCompleteWrapper = container.querySelector(".ant-select-disabled");
    expect(autoCompleteWrapper).not.toBeNull();

    // Check value
    const inputEl = container.querySelector(
      ".ant-select-selection-search-input",
    ) as HTMLInputElement;
    if (inputEl) {
      expect(inputEl.value).toBe("fixedEntry");
    }
  });

  it("should allow creating a new entry name not in available entries", async () => {
    const testContent = "test content";
    const file = makeMockRcFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

    // Mount with empty entry name to allow creation
    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName=""
        availableEntries={["existingEntry1", "existingEntry2"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    await attachFile(container, file);

    // Type into the AutoComplete input
    const entryInput = container.querySelector(
      'input[role="combobox"], .ant-select-selection-search input, .ant-select input',
    ) as HTMLInputElement;
    expect(entryInput).not.toBeNull();

    await act(async () => {
      fireEvent.change(entryInput, { target: { value: "newTestEntry" } });
    });

    // Submit form
    await submitForm(container);

    // Verify the upload process succeeded
    expect(client.getBucket).toHaveBeenCalledWith("testBucket");
    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "newTestEntry",
      expect.objectContaining({
        contentType: "text/plain",
        labels: {},
        ts: expect.any(BigInt),
      }),
    );
    expect(Buffer.from(mockWrite.mock.calls[0][0]).toString()).toBe(
      testContent,
    );
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should infer content type from file extension", async () => {
    const testContent = "binarydata";
    const file = makeMockRcFile(testContent, "demo.mcap", "");
    const { mockBucket } = mockWriting(client);

    const { container } = render(
      <UploadFileForm
        client={client}
        bucketName="testBucket"
        entryName="testEntry"
        availableEntries={["testEntry"]}
        onUploadSuccess={mockOnUploadSuccess}
      />,
    );

    await attachFile(container, file);
    await submitForm(container);

    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "application/mcap",
      }),
    );
  });
});
