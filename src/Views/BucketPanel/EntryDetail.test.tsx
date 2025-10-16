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
  ShareAltOutlined,
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

jest.mock("react-chartjs-2", () => ({
  Line: ({ data, options, ...props }: any) => (
    <div
      data-testid="data-volume-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      {...props}
    />
  ),
}));

jest.mock("chart.js", () => ({
  Chart: {
    register: jest.fn(),
  },
  LineController: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  LinearScale: jest.fn(),
  TimeScale: jest.fn(),
  LogarithmicScale: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock("chartjs-plugin-zoom", () => ({}));
jest.mock("chartjs-adapter-dayjs-4", () => ({}));

jest.mock("prettier-bytes", () => {
  return (bytes: number) => {
    if (bytes === 1024) return "1.0 KB";
    if (bytes === 2048) return "2.0 KB";
    return `${bytes} bytes`;
  };
});

import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";

const mockParams = {
  bucketName: "testBucket",
  entryName: "testEntry",
};

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
  const BASE_TIME = new Date("1970-01-08T00:00:00.000Z");

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
    jest.setSystemTime(BASE_TIME);
    mockJSDOM();

    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });

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
        await waitUntil(() => wrapper.update().find(".ant-select").length > 0);
      });
    });

    it("should show the display format select", () => {
      const select = wrapper.find('Select[data-testid="format-select"]');
      expect(select.exists()).toBe(true);
    });

    it("should show the fetch records button", () => {
      const fetchButton = wrapper.find(".fetchButton button");
      expect(fetchButton.exists()).toBe(true);
      expect(fetchButton.text()).toBe("Fetch Records");
    });

    it("should not show a separate limit input", () => {
      const limitInput = wrapper.find(".limitInput");
      expect(limitInput.exists()).toBe(false);
    });

    it("should show the CodeMirror editor with empty JSON by default", () => {
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
      expect(cmValue).toBe('{\n  "$each_t": "10m"\n}\n');

      const exampleText = wrapper.find(".jsonExample").first().text();
      expect(exampleText).toContain("Example:");
    });

    it("should call bucket.query with default $each_t when condition", async () => {
      const fetchButton = wrapper.find(".fetchButton button");
      expect(fetchButton.exists()).toBe(true);

      await act(async () => {
        fetchButton.simulate("click");
        jest.runOnlyPendingTimers();
      });

      expect(bucket.query).toHaveBeenCalledWith(
        "testEntry",
        0n,
        604800000000n,
        expect.objectContaining({
          head: true,
          strict: true,
          when: expect.objectContaining({
            $each_t: "10m",
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
    expect(rows.at(0).text()).toContain("key: value");

    expect(rows.at(1).text()).toContain("1970-01-01T00:00:00.002Z");
    expect(rows.at(1).text()).toContain("2.0 KB");
    expect(rows.at(1).text()).toContain("text/plain");
    expect(rows.at(1).text()).toContain("type: test");
  });

  it("should toggle between ISO and Unix timestamps", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    const select = wrapper.find('Select[data-testid="format-select"]').at(0);
    act(() => {
      const onChange = select.prop("onChange") as any;
      if (onChange) onChange("Unix");
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
    it("should download records smaller than 1MB", async () => {
      const smallRecord = {
        time: 1000n,
        key: "1000",
        contentType: "application/json",
        size: 1024n, // 1KB
        read: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      };

      (bucket.beginRead as jest.Mock).mockResolvedValueOnce(smallRecord);

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

      expect(bucket.beginRead).toHaveBeenCalledWith("testEntry", 1000n);
      expect(smallRecord.read).toHaveBeenCalled();
    });

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

      expect(streamSaver.createWriteStream).toHaveBeenCalledWith(
        expect.stringMatching(/^testEntry-1000\.json$/),
        { size: 1048576 },
      );
      expect(pipeToMock).toHaveBeenCalled();
    });
  });

  describe("Link Generation", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-table-row").length > 0,
        );
      });
    });

    it("should show share icon for each record", () => {
      const shareIcons = wrapper.find(ShareAltOutlined);
      expect(shareIcons.length).toBeGreaterThanOrEqual(mockRecords.length);
    });

    it("should generate and copy share link when confirmed", async () => {
      const mockLink = "http://localhost/share-link";
      (bucket as any).createQueryLink = jest.fn().mockResolvedValue(mockLink);

      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: jest.fn().mockResolvedValue(undefined) },
        configurable: true,
      });

      // Click share icon, open modal
      const shareIcon = wrapper.find(ShareAltOutlined).at(0);
      await act(async () => {
        shareIcon.simulate("click");
        jest.runAllTimers();
      });
      wrapper.update();

      // Click "Generate Link"
      const generateButton = wrapper
        .find("button")
        .filterWhere((btn) => btn.text().includes("Generate"))
        .at(0);
      await act(async () => {
        generateButton.simulate("click");
        jest.runAllTimers();
      });
      wrapper.update();

      expect(bucket.createQueryLink).toHaveBeenCalled();
      const input = wrapper.find('input[data-testid="generated-link"]');
      expect(input.prop("value")).toBe(mockLink);

      // Click "Copy"
      const copyButton = wrapper
        .find('button[data-testid="copy-button"]')
        .at(0);
      await act(async () => {
        copyButton.simulate("click");
      });
      wrapper.update();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockLink);
      expect(message.success).toHaveBeenCalledWith("Link copied to clipboard");
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

  describe("Data Volume Chart", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-table-row").length > 0,
        );
      });
    });

    it("should render the DataVolumeChart component", () => {
      const chart = wrapper.find('[data-testid="data-volume-chart"]');
      expect(chart.exists()).toBe(true);
    });

    it("should pass correct props to DataVolumeChart", () => {
      const chart = wrapper.find('[data-testid="data-volume-chart"]');
      expect(chart.exists()).toBe(true);

      const chartData = JSON.parse(chart.prop("data-chart-data"));
      expect(chartData).toHaveProperty("datasets");
      expect(chartData.datasets).toHaveLength(1);
    });

    it("should show chart data when records are available", () => {
      const chart = wrapper.find('[data-testid="data-volume-chart"]');
      expect(chart.exists()).toBe(true);

      const chartData = JSON.parse(chart.prop("data-chart-data"));
      expect(chartData.datasets[0].data.length).toBeGreaterThan(0);
    });
  });

  describe("When Condition", () => {
    it("should initialize with default $each_t value based on time range", () => {
      // Check the CodeMirror component value
      const codeMirror = wrapper.find(".react-codemirror2");
      expect(codeMirror.exists()).toBe(true);

      const textArea = codeMirror.find("textarea");
      expect(textArea.exists()).toBe(true);

      const conditionValue = textArea.prop("value") as string;
      expect(conditionValue).toBeDefined();
      expect(typeof conditionValue).toBe("string");
      expect(conditionValue).toContain("$each_t");
      expect(() => JSON.parse(conditionValue)).not.toThrow();

      const parsed = JSON.parse(conditionValue);
      expect(parsed).toHaveProperty("$each_t");
      expect(typeof parsed["$each_t"]).toBe("string");
      expect(parsed["$each_t"]).toMatch(/^\d+(\.\d+)?(ms|s|m|h|d)$/);
    });

    it("should update $each_t when time range changes and condition only contains $each_t", async () => {
      const timeRangeComponents = wrapper.find("TimeRangeDropdown");
      if (timeRangeComponents.exists()) {
        await act(async () => {
          const props = timeRangeComponents.at(0).props() as any;
          if (props.onSelectRange) {
            const oneHour = BigInt(60 * 60 * 1000 * 1000);
            const now = BigInt(Date.now() * 1000);
            props.onSelectRange(now - oneHour, now);
          }
        });

        wrapper.update();

        const updatedCodeMirror = wrapper.find(".react-codemirror2");
        const updatedTextArea = updatedCodeMirror.find("textarea");
        const updatedConditionValue = updatedTextArea.prop("value") as string;

        expect(updatedConditionValue.trim()).toBe('{\n  "$each_t": "5s"\n}');
      }
    });

    it("should not auto-update when condition contains other fields", () => {
      // Set a custom condition with additional fields
      const customCondition = {
        $each_t: "1m",
        "&label": { $eq: "test" },
      };

      const codeMirror = wrapper.find(".react-codemirror2");
      const textArea = codeMirror.find("textarea");

      act(() => {
        const onChange = textArea.prop("onChange") as any;
        if (onChange) {
          onChange({
            target: { value: JSON.stringify(customCondition, null, 2) },
          });
        }
      });

      // Try to trigger a time range change
      const timeRangeComponents = wrapper.find("TimeRangeDropdown");
      if (timeRangeComponents.exists()) {
        act(() => {
          const props = timeRangeComponents.at(0).props() as any;
          if (props.onChange) {
            const oneHour = BigInt(60 * 60 * 1000 * 1000);
            const now = BigInt(Date.now() * 1000);
            props.onChange(now - oneHour, now, true);
          }
        });
      }

      wrapper.update();

      // The condition should remain unchanged
      const finalCodeMirror = wrapper.find(".react-codemirror2");
      const finalTextArea = finalCodeMirror.find("textarea");
      const finalCondition = JSON.parse(finalTextArea.prop("value") as string);

      expect(finalCondition).toEqual(customCondition);
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
