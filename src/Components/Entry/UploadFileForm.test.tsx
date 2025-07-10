import { mount, ReactWrapper } from "enzyme";
import { MockFile, mockJSDOM } from "../../Helpers/TestHelpers";
import { APIError, Bucket, Client } from "reduct-js";
import UploadFileForm from "./UploadFileForm";
import { act } from "react-dom/test-utils";
import { Upload, Button, Alert } from "antd";
import dayjs from "dayjs";
import { UploadFile, UploadFileStatus } from "antd/es/upload/interface";
import { RcFile } from "antd/es/upload";

// test timeout
jest.setTimeout(20000);

function makeMockFile(
  testContent: string,
  name = "test.txt",
  type = "text/plain",
) {
  const file = new File([testContent], name, {
    type,
  }) as unknown as RcFile;

  const mockFile: UploadFile = {
    uid: "1",
    name,
    type,
    size: file.size,
    originFileObj: file,
    status: "done" as UploadFileStatus,
  };
  return mockFile;
}

function mockWriting(client: Client) {
  // Track what data is written
  const mockWrite = jest.fn().mockResolvedValue({});

  // Create a proper mock bucket before mounting
  const mockBucket = {
    getInfo: jest.fn().mockResolvedValue({}),
    beginWrite: jest.fn().mockResolvedValue({
      write: mockWrite,
    }),
  } as unknown as jest.Mocked<Bucket>;

  // Update client mock to return our mock bucket
  client.getBucket = jest.fn().mockResolvedValue(mockBucket);
  return { mockWrite, mockBucket };
}

async function submitForm(wrapper: ReactWrapper<any, any, React.Component>) {
  const form = wrapper.find("form");
  await act(async () => {
    form.simulate("submit", {});
    await new Promise((resolve) => setTimeout(resolve, 500));
    wrapper.update();
  });
}

async function attachFile(
  wrapper: ReactWrapper<any, any, React.Component>,
  mockFile: UploadFile<any>,
) {
  // Simulate file upload using antd Upload.Dragger
  const uploadDragger = wrapper.find(Upload.Dragger);
  expect(uploadDragger.exists()).toBe(true);

  // Set the file
  await act(async () => {
    const onChange = uploadDragger.prop("onChange");
    if (!onChange) {
      throw new Error("onChange prop is not defined");
    }

    onChange({
      file: mockFile,
      fileList: [mockFile],
    });
    wrapper.update();
  });
}

async function addLabel(wrapper: ReactWrapper<any, any, React.Component>) {
  const addLabelButton = wrapper
    .find(Button)
    .filterWhere((btn) => btn.text() === "Add Label");
  expect(addLabelButton.exists()).toBe(true);

  await act(async () => {
    addLabelButton.simulate("click");
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for render
    wrapper.update();
  });
}

describe("UploadFileForm", () => {
  const client = new Client("");
  let bucket: jest.Mocked<Bucket>;
  let wrapper: ReactWrapper;
  const mockOnUploadSuccess = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJSDOM();

    global.File = MockFile as unknown as typeof File;
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
    const mockFile = makeMockFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

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

    await attachFile(wrapper, mockFile);
    await submitForm(wrapper);

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
    expect(mockWrite).toHaveBeenCalledWith(Buffer.from(testContent));

    // Verify success callback
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should successfully upload a file with all parameters set", async () => {
    // Create test file with specific content
    const testContent = "test content with all parameters";
    const mockFile = makeMockFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

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

    await attachFile(wrapper, mockFile);

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
      const onChange = timestampInput.prop("onChange") as
        | ((date: dayjs.Dayjs | null) => void)
        | undefined;
      if (onChange) {
        onChange(testDate);
      }
      wrapper.update();
    });

    await addLabel(wrapper);
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

    await submitForm(wrapper);
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
    expect(mockWrite).toHaveBeenCalledWith(Buffer.from(testContent));

    // Verify success callback
    expect(mockOnUploadSuccess).toHaveBeenCalled();

    // Verify form was reset
    expect(wrapper.find(Upload.Dragger).prop("fileList")).toHaveLength(0);
  });

  it("should show error message for communication error", async () => {
    // Create test file with specific content
    const testContent = "test content for verification";
    const mockFile = makeMockFile(testContent);
    const { mockWrite } = mockWriting(client);
    mockWrite.mockRejectedValueOnce(new APIError("test error", 400));

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

    await attachFile(wrapper, mockFile);
    await submitForm(wrapper);

    const errorAlert = wrapper.find(Alert);
    expect(errorAlert.exists()).toBe(true);
    expect(errorAlert.prop("message")).toBe("test error");
  });

  it("should have disabled upload button when no file is set", async () => {
    // Initially, button should be disabled
    let uploadButton = wrapper.find("button.uploadButton");
    expect(uploadButton.exists()).toBe(true);
    expect(uploadButton.prop("disabled")).toBe(true);

    // Set a file
    const testContent = "test content";
    const mockFile = makeMockFile(testContent);

    // Find Upload.Dragger and set file
    const uploadDragger = wrapper.find(Upload.Dragger);
    expect(uploadDragger.exists()).toBe(true);

    await act(async () => {
      const onChange = uploadDragger.prop("onChange");
      expect(onChange).toBeDefined();
      if (!onChange) {
        throw new Error("onChange prop is not defined");
      }

      onChange({
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
      if (!onChange) {
        throw new Error("onChange prop is not defined");
      }

      onChange({
        file: { ...mockFile, status: "removed" } as UploadFile,
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
    const mockFile = makeMockFile(testContent);

    await attachFile(wrapper, mockFile);
    await addLabel(wrapper);

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

    await submitForm(wrapper);

    // Verify error message for invalid label key
    const errorAlert = wrapper.find(Alert);
    expect(errorAlert.exists()).toBe(true);
    expect(errorAlert.prop("message")).toBe(
      "Invalid label key(s): . Keys must be alphanumeric and can include underscores or hyphens.",
    );

    // Verify upload wasn't called
    expect(client.getBucket).not.toHaveBeenCalled();
  });

  it("should have disabled entry name input when entryName prop is provided", async () => {
    await act(async () => {
      wrapper = mount(
        <UploadFileForm
          client={client}
          bucketName="testBucket"
          entryName="fixedEntry"
          availableEntries={["existingEntry1", "fixedEntry"]}
          onUploadSuccess={mockOnUploadSuccess}
        />,
      );
    });

    const autoComplete = wrapper.find("AutoComplete");
    expect(autoComplete.prop("disabled")).toBe(true);
    expect(autoComplete.prop("value")).toBe("fixedEntry");
  });

  it("should allow creating a new entry name not in available entries", async () => {
    const testContent = "test content";
    const mockFile = makeMockFile(testContent);
    const { mockWrite, mockBucket } = mockWriting(client);

    // Mount with empty entry name to allow creation
    await act(async () => {
      wrapper = mount(
        <UploadFileForm
          client={client}
          bucketName="testBucket"
          entryName=""
          availableEntries={["existingEntry1", "existingEntry2"]}
          onUploadSuccess={mockOnUploadSuccess}
        />,
      );
    });

    // Attach file
    await attachFile(wrapper, mockFile);

    const autoComplete = wrapper.find("AutoComplete");
    await act(async () => {
      const onChange = autoComplete.prop("onChange");
      if (onChange) {
        onChange({ target: { value: "newTestEntry" } } as any);
      }
      wrapper.update();
    });

    const form = wrapper.find("Form").prop("form") as unknown as {
      getFieldValue: (field: string) => any;
    };
    expect(form).toBeDefined();
    const formValue = form?.getFieldValue("entryName");
    expect(formValue).toBe("newTestEntry");

    // Submit form
    await submitForm(wrapper);

    // Verify the upload process succeeded with sanitized name
    expect(client.getBucket).toHaveBeenCalledWith("testBucket");
    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "newTestEntry",
      expect.objectContaining({
        contentType: "text/plain",
        labels: {},
        ts: expect.any(BigInt),
      }),
    );
    expect(mockWrite).toHaveBeenCalledWith(Buffer.from(testContent));
    expect(mockOnUploadSuccess).toHaveBeenCalled();
  });

  it("should infer content type from file extension", async () => {
    const testContent = "binarydata";
    const mockFile = makeMockFile(testContent, "demo.mcap", "");
    const { mockBucket } = mockWriting(client);

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

    await attachFile(wrapper, mockFile);
    await submitForm(wrapper);

    expect(mockBucket.beginWrite).toHaveBeenCalledWith(
      "testEntry",
      expect.objectContaining({
        contentType: "application/mcap",
      }),
    );
  });
});
