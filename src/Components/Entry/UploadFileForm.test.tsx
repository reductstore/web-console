import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client } from "reduct-js";
import UploadFileForm from "./UploadFileForm";
import { act } from "react-dom/test-utils";
import { Upload, Button, Alert } from "antd";
import dayjs from "dayjs";

// Mock the File API
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  private content: Buffer;

  constructor(
    bits: Array<string | Buffer>,
    filename: string,
    options: { type: string; lastModified: number },
  ) {
    this.name = filename;
    this.type = options.type;
    this.lastModified = options.lastModified;
    this.content = Buffer.concat(bits.map((bit) => Buffer.from(bit)));
    this.size = this.content.length;
  }

  arrayBuffer() {
    return Promise.resolve(this.content);
  }

  text() {
    return Promise.resolve(this.content.toString("utf-8"));
  }
} as unknown as typeof File;

// test timeout
jest.setTimeout(20000);

describe("UploadFileForm", () => {
  const client = new Client("");
  let bucket: jest.Mocked<Bucket>;
  let wrapper: ReactWrapper;
  const mockOnUploadSuccess = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJSDOM();

    // Create mock bucket with all required methods
    bucket = {
      getInfo: jest.fn().mockResolvedValue({}),
      beginWrite: jest.fn().mockResolvedValue({
        write: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as jest.Mocked<Bucket>;

    client.getBucket = jest.fn().mockResolvedValue(bucket);

    await act(async () => {
      wrapper = mount(
        <UploadFileForm
          client={client}
          bucketName="testBucket"
          entryName="testEntry"
          availableEntries={["testEntry"]}
          onUploadSuccess={mockOnUploadSuccess}
        />,
      );
    });

    wrapper.update();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("should successfully upload a file with default parameters", async () => {
    // Create test file with specific content
    const testContent = "test content for verification";
    const file = new File([testContent], "test.txt", {
      type: "text/plain",
    });

    const mockFile = {
      uid: "1",
      name: "test.txt",
      type: "text/plain",
      size: file.size,
      originFileObj: file,
      status: "done",
    };

    // Track what data is written
    let writtenData: Buffer | null = null;
    const mockWrite = jest.fn().mockImplementation((data: Buffer) => {
      writtenData = data;
      return Promise.resolve();
    });

    // Create a proper mock bucket before mounting
    const mockBucket = {
      getInfo: jest.fn().mockResolvedValue({}),
      beginWrite: jest.fn().mockResolvedValue({
        write: mockWrite,
      }),
    } as unknown as jest.Mocked<Bucket>;

    // Update client mock to return our mock bucket
    client.getBucket = jest.fn().mockResolvedValue(mockBucket);

    // Remount component with updated mocks
    await act(async () => {
      wrapper = mount(
        <UploadFileForm
          client={client}
          bucketName="testBucket"
          entryName="testEntry"
          availableEntries={["testEntry"]}
          onUploadSuccess={mockOnUploadSuccess}
        />,
      );
    });

    // Simulate file upload using antd Upload.Dragger
    const uploadDragger = wrapper.find(Upload.Dragger);
    expect(uploadDragger.exists()).toBe(true);

    // Set the file
    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      onChange!({
        file: mockFile,
        fileList: [mockFile],
      });
      wrapper.update();
    });

    // Find and submit the form
    const form = wrapper.find("form");
    expect(form.exists()).toBe(true);

    await act(async () => {
      form.simulate("submit", { preventDefault: () => {} });
      // Wait for file reading and upload
      await new Promise((resolve) => setTimeout(resolve, 500));
      wrapper.update();
    });

    // Verify the upload process
    expect(client.getBucket).toHaveBeenCalledWith("testBucket");
    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "text/plain",
        labels: {},
        ts: expect.any(BigInt),
      }),
    );
    expect(mockWrite).toHaveBeenCalled();

    // Verify the actual content that was uploaded
    if (writtenData) {
      const uploadedContent = writtenData.toString("utf-8");
      expect(uploadedContent).toBe(testContent);
    }

    // Verify success callback
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should successfully upload a file with all parameters set", async () => {
    // Create test file with specific content
    const testContent = "test content with all parameters";
    const file = new File([testContent], "test.txt", {
      type: "text/plain",
      lastModified: Date.now(),
    });

    const mockFile = {
      uid: "1",
      name: "test.txt",
      type: "text/plain",
      size: file.size,
      originFileObj: file,
      status: "done",
    };

    // Track what data is written
    let writtenData: Buffer | null = null;
    const mockWrite = jest.fn().mockImplementation((data: Buffer) => {
      writtenData = data;
      return Promise.resolve();
    });

    const mockBucket = {
      getInfo: jest.fn().mockResolvedValue({}),
      beginWrite: jest.fn().mockResolvedValue({
        write: mockWrite,
      }),
    } as unknown as jest.Mocked<Bucket>;

    client.getBucket = jest.fn().mockResolvedValue(mockBucket);

    // Remount component with updated mocks
    await act(async () => {
      wrapper = mount(
        <UploadFileForm
          client={client}
          bucketName="testBucket"
          entryName="testEntry"
          availableEntries={["testEntry"]}
          onUploadSuccess={mockOnUploadSuccess}
        />,
      );
    });

    // Set the file
    const uploadDragger = wrapper.find(Upload.Dragger);
    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      onChange!({
        file: mockFile,
        fileList: [mockFile],
      });
      wrapper.update();
    });

    // Set content type
    const contentTypeInput = wrapper.find(
      'input[data-testid="content-type-input"]',
    );
    await act(async () => {
      contentTypeInput.simulate("change", {
        target: { value: "application/json" },
      });
      wrapper.update();
    });

    // Set timestamp using dayjs
    const testDate = dayjs("2024-01-01T12:00:00Z");
    const timestampInput = wrapper.find(
      'DatePicker[data-testid="timestamp-input"]',
    );
    await act(async () => {
      timestampInput.prop("onChange")(testDate);
      wrapper.update();
    });

    // Add label
    const addLabelButton = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text() === "Add Label");
    expect(addLabelButton.exists()).toBe(true);

    await act(async () => {
      addLabelButton.simulate("click");
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for render
      wrapper.update();
    });

    const labelInputs = wrapper.find('input[data-testid="label-key-input"]');
    expect(labelInputs.exists()).toBe(true);

    await act(async () => {
      labelInputs.simulate("change", { target: { value: "version" } });
      wrapper.update();
    });

    const labelValueInputs = wrapper.find(
      'input[data-testid="label-value-input"]',
    );
    expect(labelValueInputs.exists()).toBe(true);

    await act(async () => {
      labelValueInputs.simulate("change", { target: { value: "1.0.0" } });
      wrapper.update();
    });

    // Submit form
    const form = wrapper.find("form");
    await act(async () => {
      form.simulate("submit", { preventDefault: () => {} });
      await new Promise((resolve) => setTimeout(resolve, 500));
      wrapper.update();
    });

    // Verify the upload process
    expect(client.getBucket).toHaveBeenCalledWith("testBucket");

    // Verify beginWrite was called with all parameters
    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "application/json",
        labels: { version: "1.0.0" },
        ts: BigInt(testDate.valueOf() * 1000),
      }),
    );

    // Verify the write was called with correct content
    expect(mockWrite).toHaveBeenCalled();
    if (writtenData) {
      const uploadedContent = writtenData.toString("utf-8");
      expect(uploadedContent).toBe(testContent);
    }

    // Verify success callback
    expect(mockOnUploadSuccess).toHaveBeenCalled();

    // Verify form was reset
    expect(wrapper.find(Upload.Dragger).prop("fileList")).toHaveLength(0);
  });

  it("should have disabled upload button when no file is set", async () => {
    // Initially, button should be disabled
    let uploadButton = wrapper.find("button.uploadButton");
    expect(uploadButton.exists()).toBe(true);
    expect(uploadButton.prop("disabled")).toBe(true);

    // Set a file
    const testContent = "test content";
    const file = new File([testContent], "test.txt", {
      type: "text/plain",
      lastModified: Date.now(),
    });

    const mockFile = {
      uid: "1",
      name: "test.txt",
      type: "text/plain",
      size: file.size,
      originFileObj: file,
      status: "done",
    };

    // Find Upload.Dragger and set file
    const uploadDragger = wrapper.find(Upload.Dragger);
    expect(uploadDragger.exists()).toBe(true);

    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      onChange!({
        file: mockFile,
        fileList: [mockFile],
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      wrapper.update();
    });

    // Get fresh reference to button and check if it's enabled
    uploadButton = wrapper.find("button.uploadButton");
    expect(uploadButton.prop("disabled")).toBe(false);

    // Remove the file
    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      onChange!({
        file: { ...mockFile, status: "removed" },
        fileList: [],
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      wrapper.update();
    });

    // Get fresh reference to button and check if it's disabled again
    uploadButton = wrapper.find("button.uploadButton");
    expect(uploadButton.prop("disabled")).toBe(true);
  });

  it("should display error message when communication error occurs during upload", async () => {
    // Create test file
    const testContent = "test content";
    const file = new File([testContent], "test.txt", {
      type: "text/plain",
      lastModified: Date.now(),
    });

    const mockFile = {
      uid: "1",
      name: "test.txt",
      type: "text/plain",
      size: file.size,
      originFileObj: file,
      status: "done",
    };

    // Set the file
    const uploadDragger = wrapper.find(Upload.Dragger);
    expect(uploadDragger.exists()).toBe(true);

    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      onChange!({
        file: mockFile,
        fileList: [mockFile],
      });
      wrapper.update();
    });

    // Add label
    const addLabelButton = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text() === "Add Label");
    expect(addLabelButton.exists()).toBe(true);

    await act(async () => {
      addLabelButton.simulate("click");
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for render
      wrapper.update();
    });

    // Verify label inputs exist before interacting
    const labelItem = wrapper.find(".labelItem");
    expect(labelItem.exists()).toBe(true);

    // Set only the value (leaving key empty to trigger validation error)
    const labelValueInput = labelItem.find('input[placeholder="Value"]');
    expect(labelValueInput.exists()).toBe(true);

    await act(async () => {
      labelValueInput.simulate("change", { target: { value: "value1" } });
      wrapper.update();
    });

    // Submit form
    const form = wrapper.find("form");
    await act(async () => {
      form.simulate("submit", { preventDefault: () => {} });
      await new Promise((resolve) => setTimeout(resolve, 500));
      wrapper.update();
    });

    // Verify error message for invalid label key
    const errorAlert = wrapper.find(Alert);
    expect(errorAlert.exists()).toBe(true);
    expect(errorAlert.prop("message")).toBe(
      "Invalid label key(s): . Keys must be alphanumeric and can include underscores or hyphens.",
    );

    // Verify upload wasn't called
    expect(client.getBucket).not.toHaveBeenCalled();
  });
});
