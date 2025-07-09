import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client, EntryInfo } from "reduct-js";
import EntryDetail from "./EntryDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";
import { act } from "react-dom/test-utils";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { message } from "antd";
import streamSaver from "streamsaver";

type RemoveRecordFn = (entry: string, ts: bigint) => Promise<void>;
type MockedRemoveRecord = RemoveRecordFn & {
  mockClear: () => void;
  mockRejectedValueOnce: (value: Error) => void;
};

jest.mock("react-codemirror2", () => ({
  Controlled: (props: any) => {
    return (
      <div className="react-codemirror2" data-testid="codemirror-mock">
        <textarea
          value={props.value}
          onChange={(e) => props.onBeforeChange(null, null, e.target.value)}
          onBlur={(e) =>
            props.onBlur && props.onBlur({ getValue: () => e.target.value })
          }
        />
      </div>
    );
  },
}));

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

// Mock the useParams hook for all tests
const mockParams = {
  bucketName: "testBucket",
  entryName: "testEntry",
};

// Mock the streamsaver library
jest.mock("streamsaver", () => ({
  createWriteStream: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => mockParams,
}));

describe("EntryDetail", () => {
  // Create a properly mocked client
  const client = {
    getBucket: jest.fn(),
  } as unknown as Client;

  // Permissions object to be passed as props
  const permissions = {
    fullAccess: true,
    write: ["testBucket"],
  };
  // Mock the Record Reader and Writer
  const mockReader = {
    labels: { key: "value" },
    contentType: "application/json",
    read: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  const mockWriter = {
    write: jest.fn().mockResolvedValue(undefined),
  };
  // Mock the bucket with all the methods we need
  // Properly type the jest mocked functions
  const bucket = {
    query: jest.fn(),
    getEntryList: jest.fn(),
    beginRead: jest.fn().mockResolvedValue(mockReader) as jest.Mock,
    beginWrite: jest.fn().mockResolvedValue(mockWriter) as jest.Mock,
    removeRecord: jest
      .fn()
      .mockResolvedValue(undefined) as unknown as MockedRemoveRecord,
    update: jest.fn().mockResolvedValue(undefined) as jest.Mock,
  } as unknown as Bucket;
  let wrapper: ReactWrapper;
  const mockRecords = [
    {
      time: 1000n,
      timestamp: 1000n,
      key: "1000",
      size: 1024n,
      contentType: "application/json",
      labels: { key: "value" },
    },
    {
      time: 2000n,
      timestamp: 2000n,
      key: "2000",
      size: 2048n,
      contentType: "text/plain",
      labels: { type: "test" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockJSDOM();

    // No need to mock getTokenPermissions anymore as we pass permissions directly

    client.getBucket = jest.fn().mockResolvedValue(bucket);

    // Mock Ant Design message component
    message.success = jest.fn() as unknown as typeof message.success & {
      mockClear: () => void;
    };
    message.error = jest.fn() as unknown as typeof message.error & {
      mockClear: () => void;
    };

    bucket.query = jest.fn().mockImplementation(() => ({
      async *[Symbol.asyncIterator]() {
        for (const record of mockRecords) {
          yield record;
        }
      },
    }));

    bucket.getEntryList = jest.fn().mockResolvedValue([
      {
        name: "testEntry",
        blockCount: 5n,
        recordCount: 100n,
        size: 1024n,
        oldestRecord: 0n,
        latestRecord: 10000n,
        createdAt: 0n,
        updatedAt: 10000n,
      } as EntryInfo,
    ]);

    wrapper = mount(
      <MemoryRouter>
        <EntryDetail client={client} permissions={permissions} />
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("UI Elements", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-checkbox").length > 0,
        );
      });
    });

    it("should show the Unix timestamp toggle", () => {
      const toggle = wrapper.find(".ant-checkbox-wrapper");
      expect(toggle.exists()).toBe(true);
      expect(toggle.text()).toContain("Unix Timestamp");
    });

    it("should show the date picker by default", () => {
      const datePicker = wrapper.find(".ant-picker-range");
      expect(datePicker.exists()).toBe(true);
      expect(datePicker.props().className).toContain("ant-picker-range");
    });

    it("should show the fetch records button", () => {
      const fetchButton = wrapper.find("button");
      expect(fetchButton.exists()).toBe(true);
      expect(fetchButton.at(0).text()).toBe("Fetch Records");
    });

    it("should not show a separate limit input", () => {
      const limitInput = wrapper.find(".limitInput");
      expect(limitInput.exists()).toBe(false);
    });

    it("should show the CodeMirror editor with $limit in default JSON", () => {
      const codeMirror = wrapper.find(".react-codemirror2");
      expect(codeMirror.exists()).toBe(true);
      const cmInstance = wrapper.find("Controlled").prop("options");
      expect(cmInstance).toEqual(
        expect.objectContaining({
          mode: { name: "javascript", json: true },
          lineNumbers: true,
        }),
      );

      const cmValue = wrapper.find("Controlled").prop("value");
      expect(cmValue).toContain("$limit");

      const exampleText = wrapper.find(".jsonExample").at(0).text();
      expect(exampleText).toContain("$limit");
    });

    it("should call bucket.query with the correct when condition", async () => {
      const fetchButton = wrapper.find(".fetchButton button");
      expect(fetchButton.exists()).toBe(true);

      await act(async () => {
        fetchButton.simulate("click");
        jest.runOnlyPendingTimers();
      });

      expect(bucket.query).toHaveBeenCalledWith(
        "testEntry",
        undefined,
        undefined,
        expect.objectContaining({
          head: true,
          strict: true,
          when: expect.objectContaining({
            $limit: 10,
          }),
        }),
      );
    });
  });

  it("should fetch and display records", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    const rows = wrapper.find(".ant-table-row");
    expect(rows.length).toBe(2);

    expect(rows.at(0).text()).toContain("1970-01-01T00:00:00.001Z");
    expect(rows.at(0).text()).toContain("1.0 KB");
    expect(rows.at(0).text()).toContain("application/json");
    expect(rows.at(0).text()).toContain('"key": "value"');

    expect(rows.at(1).text()).toContain("1970-01-01T00:00:00.002Z");
    expect(rows.at(1).text()).toContain("2.0 KB");
    expect(rows.at(1).text()).toContain("text/plain");
    expect(rows.at(1).text()).toContain('"type": "test"');
  });

  it("should toggle between ISO and Unix timestamps", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    const checkbox = wrapper.find(".ant-checkbox-input");
    act(() => {
      checkbox.simulate("change", { target: { checked: true } });
    });

    const rows = wrapper.find(".ant-table-row");
    expect(rows.at(0).text()).toContain("1000");
    expect(rows.at(1).text()).toContain("2000");
  });

  it("should show a download icon for each record", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });
    const downloadIcons = wrapper.find(DownloadOutlined);
    expect(downloadIcons.length).toBe(2);
  });

  describe("Record Download", () => {
    it("should use stream for records larger than 1MB", async () => {
      const pipeToMock = jest.fn().mockResolvedValue(undefined);
      const largeRecord = {
        time: 1000n,
        key: "1000",
        contentType: "application/json",
        size: 1_048_576n, // 1MB
        stream: { pipeTo: pipeToMock },
      };

      (bucket.beginRead as jest.Mock).mockResolvedValueOnce(largeRecord);
      (streamSaver.createWriteStream as jest.Mock).mockReturnValue({
        writable: {},
      });

      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(DownloadOutlined).length > 0,
        );
      });

      const downloadIcon = wrapper.find(DownloadOutlined).at(0);
      expect(downloadIcon.exists()).toBe(true);

      await act(async () => {
        downloadIcon.simulate("click");
        jest.runAllTimers();
      });

      expect(pipeToMock).toHaveBeenCalled();
      expect(streamSaver.createWriteStream).toHaveBeenCalledWith(
        expect.stringMatching(/^testEntry-1000\.json$/),
        { size: 1048576 },
      );
    });
  });

  describe("Label Editing", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-table-row").length > 0,
        );
      });
    });

    it("should show edit labels icon for each record", () => {
      const editIcons = wrapper.find(EditOutlined);
      expect(editIcons.length).toBe(2);
    });

    it("should open edit labels modal when edit icon is clicked", () => {
      const recordRow = wrapper.find(".ant-table-row").at(0);
      expect(recordRow.exists()).toBe(true);

      const editIcon = wrapper.find(EditOutlined).at(0);
      expect(editIcon.exists()).toBe(true);

      const { onClick } = editIcon.props();
      expect(typeof onClick).toBe("function");

      act(() => {
        (onClick as any)(
          {
            stopPropagation: jest.fn(),
          },
          mockRecords[0],
        );
      });
      wrapper.update();

      const modal = wrapper.find(".ant-modal");
      expect(modal.exists()).toBe(true);

      const modalContent = modal.find(".ant-modal-body").text();
      expect(modalContent).toContain("Timestamp");
      expect(modalContent).toContain("Content Type");
      expect(modalContent).toContain("Size");

      // Check for the label table instead of CodeMirror
      const labelTable = modal.find(".edit-record-labels-modal .ant-table");
      expect(labelTable.exists()).toBe(true);
    });

    it("should verify record labels can be updated", async () => {
      const originalData = new Uint8Array([1, 2, 3, 4]);

      jest.clearAllMocks();

      mockReader.read.mockResolvedValue(originalData);
      mockReader.contentType = "application/json";
      mockReader.labels = { key: "value" };

      bucket.update = jest.fn().mockResolvedValue(undefined);

      (bucket.beginRead as jest.Mock).mockResolvedValue(mockReader);

      const recordRows = wrapper.find(".ant-table-row");
      expect(recordRows.length).toBeGreaterThan(0);

      const editIcon = wrapper.find(EditOutlined).at(0);
      expect(editIcon.exists()).toBe(true);

      const { onClick } = editIcon.props();

      act(() => {
        (onClick as any)(
          {
            stopPropagation: jest.fn(),
          },
          mockRecords[0],
        );
      });
      wrapper.update();

      const modal = wrapper.find(".ant-modal");
      expect(modal.exists()).toBe(true);

      const buttons = modal.find(".ant-modal-footer").find("button");
      expect(buttons.length).toBeGreaterThan(1);

      const okButton = buttons.at(1);
      expect(okButton.exists()).toBe(true);

      const okButtonOnClick = okButton.props().onClick;

      await act(async () => {
        (okButtonOnClick as any)();
        jest.runAllTimers();
      });

      expect(bucket.update).toHaveBeenCalled();

      expect(bucket.update).toHaveBeenCalledWith(
        "testEntry",
        mockRecords[0].time,
        expect.any(Object),
      );
    });
  });

  describe("Record Deletion", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-table-row").length > 0,
        );
      });
    });

    it("should show delete icon for each record", () => {
      const deleteIcons = wrapper.find(DeleteOutlined);
      expect(deleteIcons.length).toBeGreaterThanOrEqual(mockRecords.length);
    });

    it("should open delete confirmation modal when delete icon is clicked", () => {
      const recordRow = wrapper.find(".ant-table-row").at(0);
      expect(recordRow.exists()).toBe(true);

      const deleteIcon = wrapper.find(DeleteOutlined).at(0);
      expect(deleteIcon.exists()).toBe(true);

      const { onClick } = deleteIcon.props();
      expect(typeof onClick).toBe("function");

      act(() => {
        (onClick as any)(
          {
            stopPropagation: jest.fn(),
          },
          mockRecords[0],
        );
      });
      wrapper.update();

      const modal = wrapper.find(".ant-modal");
      expect(modal.exists()).toBe(true);

      // Check the modal title
      const modalTitle = modal.find(".ant-modal-title").text();
      expect(modalTitle).toContain("Remove entry");
    });

    it("should delete record when confirmation is confirmed", async () => {
      jest.clearAllMocks();

      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-table-row").length > 0,
        );
      });

      bucket.removeRecord = jest.fn().mockResolvedValue(undefined);
      message.success = jest.fn();
      (client.getBucket as jest.Mock).mockResolvedValue(bucket);

      const recordRow = wrapper.find(".ant-table-row").at(0);
      expect(recordRow.exists()).toBe(true);

      const deleteIcon = recordRow.find(DeleteOutlined).at(0);
      expect(deleteIcon.exists()).toBe(true);
      expect(deleteIcon.props().title).toBe("Delete record");

      const { onClick } = deleteIcon.props();
      expect(typeof onClick).toBe("function");

      act(() => {
        (onClick as any)({ stopPropagation: jest.fn() }, mockRecords[0]);
      });
      wrapper.update();

      const modal = wrapper.find(".ant-modal");
      expect(modal.exists()).toBe(true);

      const modalTitle = modal.find(".ant-modal-title").text();
      expect(modalTitle).toBe("Delete Record");

      const modalFooter = modal.find(".ant-modal-footer");
      expect(modalFooter.exists()).toBe(true);

      const buttons = modalFooter.find("button");
      expect(buttons.length).toBe(2);

      const deleteButton = buttons.at(1);
      expect(deleteButton.exists()).toBe(true);

      await act(async () => {
        const onClickHandler = deleteButton.props().onClick;
        expect(typeof onClickHandler).toBe("function");
        (onClickHandler as any)();
        jest.runAllTimers();
      });
      wrapper.update();

      expect(bucket.removeRecord).toHaveBeenCalledWith("testEntry", 1000n);
      expect(message.success).toHaveBeenCalledWith(
        "Record deleted successfully",
      );
    });
  });
});
