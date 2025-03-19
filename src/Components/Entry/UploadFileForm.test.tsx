import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Client } from "reduct-js";
import EntryDetail from "../../Views/BucketPanel/EntryDetail";
import { MemoryRouter } from "react-router-dom";
import { act } from "react-dom/test-utils";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import { Modal, Button } from "antd";
import fs from "fs";
import path from "path";
import { waitFor } from "@testing-library/react";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    bucketName: "testBucket",
    entryName: "testEntry",
  }),
}));

describe("UploadFileForm", () => {
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.resetModules();

    mockJSDOM();

    wrapper = mount(
      <MemoryRouter>
        <EntryDetail client={new Client("")} />
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("UI Elements", () => {
    beforeEach(async () => {});

    it("should successfully upload with default values", async () => {
      const onUploadSuccess = jest.fn();

      const wrapper = mount(
        <MemoryRouter>
          <EntryDetail
            client={new Client("")}
            permissions={{ fullAccess: true }}
          />
        </MemoryRouter>,
      );

      const uploadButton = wrapper.find('button[title="Upload File"]');
      expect(uploadButton.exists()).toBe(true);

      await act(async () => {
        uploadButton.simulate("click");
      });
      wrapper.update();

      const uploadModal = wrapper
        .find(Modal)
        .filterWhere((modal) => modal.prop("title") === "Upload File");
      expect(uploadModal.props().open).toBe(true);

      const filePath = path.resolve(__dirname, "test_files", "test.txt");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const file = new File([fileContent], "test.txt", {
        type: "text/plain",
        lastModified: new Date().getTime(),
      });

      const uploadForm = uploadModal.find("UploadFileForm");
      expect(uploadForm.exists()).toBe(true);

      const fileInput = uploadForm.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);

      const reader = new FileReader();
      reader.onload = async () => {
        const dataTransfer = {
          files: [file],
          items: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        };

        await act(async () => {
          Object.defineProperty(fileInput.getDOMNode(), "files", {
            value: [file],
            writable: false,
          });
          fileInput.simulate("change", { target: { files: [file] } });
          wrapper.update();
        });

        await waitFor(() => {
          const inputElement = fileInput.getDOMNode() as HTMLInputElement;
          expect(inputElement.files?.[0]).toEqual(file);

          const uploadButtonInForm = uploadForm.find("button.uploadButton");
          expect(uploadButtonInForm.exists()).toBe(true);
          expect(uploadButtonInForm.prop("disabled")).toBe(false);
          uploadButtonInForm.simulate("click");
        });

        await act(async () => {
          wrapper.update();
        });

        // Check if the onUploadSuccess callback was called
        expect(onUploadSuccess).toHaveBeenCalled();
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
      };

      reader.readAsText(file);

      // Check if the modal is still open
      if (uploadModal.props().open) {
        console.warn(
          "Upload modal is still open, indicating a potential issue with the upload process.",
        );
      }
    });

    it("should successfully upload with all parameters set", async () => {
      const onUploadSuccess = jest.fn();

      const wrapper = mount(
        <MemoryRouter>
          <EntryDetail
            client={new Client("")}
            permissions={{ fullAccess: true }}
          />
        </MemoryRouter>,
      );

      const uploadButton = wrapper.find('button[title="Upload File"]');
      expect(uploadButton.exists()).toBe(true);
      expect(uploadButton.prop("disabled")).toBe(false);

      uploadButton.simulate("click");
      wrapper.update();

      const uploadModal = wrapper
        .find(Modal)
        .filterWhere((modal) => modal.prop("title") === "Upload File");
      expect(uploadModal.props().open).toBe(true);

      const uploadForm = uploadModal.find("UploadFileForm");
      expect(uploadForm.exists()).toBe(true);

      const fileInput = uploadForm.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);

      const contentTypeInput = uploadForm.find(
        'input[data-testid="content-type-input"]',
      );
      expect(contentTypeInput.exists()).toBe(true);
      contentTypeInput.simulate("change", { target: { value: "text/plain" } });
      wrapper.update();

      const timestampInput = uploadForm.find(
        'DatePicker[data-testid="timestamp-input"]',
      );
      expect(timestampInput.exists()).toBe(true);

      const addLabelButton = uploadForm
        .find(Button)
        .filterWhere((btn) => btn.text() === "Add Label");
      expect(addLabelButton.exists()).toBe(true);

      // Simulate clicking the "Add Label" button
      addLabelButton.simulate("click");
      wrapper.update();

      // Find and interact with the label key input
      const labelsKeyInput = wrapper.find(
        'input[data-testid="label-key-input"]',
      );
      expect(labelsKeyInput.exists()).toBe(true);

      labelsKeyInput.simulate("change", { target: { value: "key1" } });
      wrapper.update();

      const labelsValueInput = wrapper.find(
        'input[data-testid="label-value-input"]',
      );
      expect(labelsValueInput.exists()).toBe(true);

      labelsValueInput.simulate("change", { target: { value: "value1" } });
      wrapper.update();

      const filePath = path.resolve(__dirname, "test_files", "test.txt");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const file = new File([fileContent], "test.txt", {
        type: "text/plain",
        lastModified: new Date().getTime(),
      });

      const reader = new FileReader();
      reader.onload = async () => {
        const dataTransfer = {
          files: [file],
          items: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        };

        Object.defineProperty(fileInput.getDOMNode(), "files", {
          value: [file],
          writable: false,
        });
        fileInput.simulate("change", { target: { files: [file] } });
        wrapper.update();
        const inputElement = fileInput.getDOMNode() as HTMLInputElement;
        expect(inputElement.files?.[0]).toEqual(file);

        const uploadButtonInForm = uploadForm.find("button.uploadButton");
        expect(uploadButtonInForm.exists()).toBe(true);
        expect(uploadButtonInForm.prop("disabled")).toBe(false);
        uploadButtonInForm.simulate("click");
        wrapper.update();
        expect(onUploadSuccess).toHaveBeenCalled();
      };
    });

    it("should display an error message on communication error during upload", async () => {
      const wrapper = mount(
        <MemoryRouter>
          <EntryDetail
            client={new Client("")}
            permissions={{ fullAccess: true }}
          />
        </MemoryRouter>,
      );

      const uploadButton = wrapper.find('button[title="Upload File"]');
      expect(uploadButton.exists()).toBe(true);
      expect(uploadButton.prop("disabled")).toBe(false);

      uploadButton.simulate("click");
      wrapper.update();

      const uploadModal = wrapper
        .find(Modal)
        .filterWhere((modal) => modal.prop("title") === "Upload File");
      expect(uploadModal.props().open).toBe(true);

      const uploadForm = uploadModal.find("UploadFileForm");
      expect(uploadForm.exists()).toBe(true);

      const fileInput = uploadForm.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);

      const addLabelButton = uploadForm
        .find(Button)
        .filterWhere((btn) => btn.text() === "Add Label");
      expect(addLabelButton.exists()).toBe(true);

      // Simulate clicking the "Add Label" button
      addLabelButton.simulate("click");
      wrapper.update();

      const labelsValueInput = wrapper.find(
        'input[data-testid="label-value-input"]',
      );
      expect(labelsValueInput.exists()).toBe(true);

      labelsValueInput.simulate("change", { target: { value: "value1" } });
      wrapper.update();

      const filePath = path.resolve(__dirname, "test_files", "test.txt");
      const fileContent = fs.readFileSync(filePath, "utf-8");

      const file = new File([fileContent], "test.txt", {
        type: "text/plain",
        lastModified: new Date().getTime(),
      });

      const reader = new FileReader();
      reader.onload = async () => {
        const dataTransfer = {
          files: [file],
          items: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        };

        Object.defineProperty(fileInput.getDOMNode(), "files", {
          value: [file],
          writable: false,
        });
        fileInput.simulate("change", { target: { files: [file] } });
        wrapper.update();
        const inputElement = fileInput.getDOMNode() as HTMLInputElement;
        expect(inputElement.files?.[0]).toEqual(file);

        const uploadButtonInForm = uploadForm.find("button.uploadButton");
        expect(uploadButtonInForm.exists()).toBe(true);
        expect(uploadButtonInForm.prop("disabled")).toBe(false);
        uploadButtonInForm.simulate("click");
        wrapper.update();
        const errorMessage = uploadForm.find(".uploadError");
        expect(errorMessage.exists()).toBe(true);
        expect(errorMessage.text()).toContain(
          "Invalid label key(s): . Keys must be alphanumeric and can include underscores or hyphens.",
        );
      };
    });
  });
});
