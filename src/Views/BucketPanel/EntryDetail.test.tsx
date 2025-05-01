import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client, EntryInfo } from "reduct-js";
import EntryDetail from "./EntryDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";
import { act } from "react-dom/test-utils";
import { DownloadOutlined, EditOutlined } from "@ant-design/icons";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

// Mock CodeMirror to prevent getBoundingClientRect errors in tests
jest.mock("react-codemirror2", () => ({
  Controlled: (props: any) => {
    // Simple mock that just renders a div and calls onChange when needed
    return (
      <div
        className="react-codemirror2 jsonEditor"
        data-testid="codemirror-mock"
      >
        <textarea
          value={props.value}
          onChange={(e) => props.onBeforeChange?.(null, null, e.target.value)}
        />
      </div>
    );
  },
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    bucketName: "testBucket",
    entryName: "testEntry",
  }),
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
    removeRecord: jest.fn().mockResolvedValue(undefined) as jest.Mock,
  } as unknown as Bucket;
  let wrapper: ReactWrapper;
  const mockRecords = [
    {
      time: 1000n,
      size: 1024n,
      contentType: "application/json",
      labels: { key: "value" },
    },
    {
      time: 2000n,
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

    it("should show the records limit input", () => {
      const limitInput = wrapper.find(".ant-input-number");
      expect(limitInput.exists()).toBe(true);
      expect(limitInput.props().className).toContain("ant-input-number");
    });

    it("should show the CodeMirror editor for JSON filtering", () => {
      const codeMirror = wrapper.find(".react-codemirror2");
      expect(codeMirror.exists()).toBe(true);
      const cmInstance = wrapper.find("Controlled").prop("options");
      expect(cmInstance).toEqual(
        expect.objectContaining({
          mode: { name: "javascript", json: true },
          lineNumbers: true,
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

  it("should create a download link on download icon click", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    act(() => {
      wrapper.find(DownloadOutlined).at(0).simulate("click");
    });
    wrapper.update();

    const downloadLink = wrapper.find("a");
    expect(downloadLink.length).toBe(3);
    expect(downloadLink.at(0).props().children).toBe("testBucket");
    expect(downloadLink.at(1)).toBeDefined();
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

      const onClickHandler = editIcon.props().onClick;
      expect(typeof onClickHandler).toBe("function");

      const mockEvent = {
        stopPropagation: jest.fn(),
      } as unknown as React.MouseEvent;
      const mockRecordWithKey = { ...mockRecords[0], key: "1000" };

      act(() => {
        // Pass both the event and record to the handler
        // @ts-ignore - We're manually calling with test data
        onClickHandler(mockEvent, mockRecordWithKey);
      });
      wrapper.update();

      const modal = wrapper.find(".ant-modal");
      expect(modal.exists()).toBe(true);
      expect(modal.find(".ant-modal-title").text()).toBe("Edit Record Labels");

      const modalContent = modal.find(".ant-modal-body").text();
      expect(modalContent).toContain("Record Timestamp");
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
      (bucket.removeRecord as jest.Mock).mockResolvedValue(undefined);
      (bucket.beginWrite as jest.Mock).mockResolvedValue(mockWriter);
      mockWriter.write.mockResolvedValue(undefined);

      const recordRows = wrapper.find(".ant-table-row");
      expect(recordRows.length).toBeGreaterThan(0);

      const firstRow = recordRows.at(0);

      const editIcon = wrapper.find(EditOutlined).at(0);
      expect(editIcon.exists()).toBe(true);

      const onClick = editIcon.props().onClick;

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
});
