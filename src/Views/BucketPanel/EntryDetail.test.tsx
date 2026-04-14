import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import type { Mock } from "vitest";
import { act } from "react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client, EntryInfo, Status } from "reduct-js";
import EntryDetail from "./EntryDetail";
import { MemoryRouter } from "react-router-dom";
import { message } from "antd";

type RemoveRecordFn = (entry: string, ts: bigint) => Promise<void>;
type MockedRemoveRecord = RemoveRecordFn & {
  mockClear: () => void;
  mockRejectedValueOnce: (value: Error) => void;
};

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div className="monaco-editor-mock" data-testid="monaco-editor-mock">
        <textarea
          value={props.value}
          onChange={(e) => props.onChange && props.onChange(e.target.value)}
          onBlur={() => props.onBlur && props.onBlur()}
        />
      </div>
    );
  },
}));

vi.mock("@reductstore/reduct-query-monaco", () => ({
  getCompletionProvider: vi.fn(() => ({
    provideCompletionItems: vi.fn(() => ({ suggestions: [] })),
  })),
}));

vi.mock("react-chartjs-2", () => ({
  Line: ({ data, options, ...props }: any) => (
    <div
      data-testid="data-volume-chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      {...props}
    />
  ),
}));

vi.mock("chart.js", () => ({
  Chart: {
    register: vi.fn(),
  },
  LineController: vi.fn(),
  LineElement: vi.fn(),
  PointElement: vi.fn(),
  LinearScale: vi.fn(),
  TimeScale: vi.fn(),
  LogarithmicScale: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

vi.mock("chartjs-plugin-zoom", () => ({ default: {} }));

vi.mock("prettier-bytes", () => ({
  default: (bytes: number) => {
    if (bytes === 1024) return "1.0 KB";
    if (bytes === 2048) return "2.0 KB";
    return `${bytes} bytes`;
  },
}));

const mockParams = {
  bucketName: "testBucket",
  entryName: "testEntry",
};

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useParams: () => mockParams,
}));

describe("EntryDetail", () => {
  // Create a properly mocked client
  const client = {
    getBucket: vi.fn(),
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
    read: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };
  const mockWriter = {
    write: vi.fn().mockResolvedValue(undefined),
  };
  // Mock the bucket with all the methods we need
  const bucket = {
    query: vi.fn(),
    getEntryList: vi.fn(),
    beginRead: vi.fn().mockResolvedValue(mockReader) as Mock,
    beginWrite: vi.fn().mockResolvedValue(mockWriter) as Mock,
    removeRecord: vi
      .fn()
      .mockResolvedValue(undefined) as unknown as MockedRemoveRecord,
    update: vi.fn().mockResolvedValue(undefined) as Mock,
    readAttachments: vi.fn().mockResolvedValue({}) as Mock,
    writeAttachments: vi.fn().mockResolvedValue(undefined) as Mock,
    removeAttachments: vi.fn().mockResolvedValue(undefined) as Mock,
  } as unknown as Bucket;

  const BASE_TIME = new Date("1970-01-01T01:00:00.000Z").getTime();

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

  let container: HTMLElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(BASE_TIME);
    mockJSDOM();

    globalThis.requestAnimationFrame = vi.fn((cb) => {
      const id = Date.now();
      queueMicrotask(() => cb(0));
      return id;
    });

    client.getBucket = vi.fn().mockResolvedValue(bucket);

    // Mock Ant Design message component
    message.success = vi.fn() as unknown as typeof message.success & {
      mockClear: () => void;
    };
    message.error = vi.fn() as unknown as typeof message.error & {
      mockClear: () => void;
    };

    bucket.query = vi.fn().mockImplementation(() => ({
      async *[Symbol.asyncIterator]() {
        for (const record of mockRecords) {
          yield record;
        }
      },
    }));

    bucket.getEntryList = vi.fn().mockResolvedValue([
      {
        name: "testEntry",
        blockCount: 5n,
        recordCount: 100n,
        size: 1024n,
        oldestRecord: 0n,
        latestRecord: 10000n,
        createdAt: 0n,
        updatedAt: 10000n,
        status: Status.READY,
      } as EntryInfo,
    ]);

    await act(async () => {
      const result = render(
        <MemoryRouter>
          <EntryDetail
            client={client}
            permissions={permissions}
            apiUrl="https://example.com"
          />
        </MemoryRouter>,
      );
      ({ container } = result);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe("UI Elements", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(container.querySelector(".ant-select")).not.toBeNull();
      });
    });

    it("should show the display format select", () => {
      const select = container.querySelector('[data-testid="format-select"]');
      expect(select).not.toBeNull();
    });

    it("should show the fetch records button", () => {
      const fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton).not.toBeNull();
      expect(fetchButton.textContent).toBe("Fetch Records");
    });

    it("should not show a separate limit input", () => {
      const limitInput = container.querySelector(".limitInput");
      expect(limitInput).toBeNull();
    });

    it("should show the Monaco editor with default JSON", () => {
      const monacoEditor = container.querySelector(".monaco-editor-mock");
      expect(monacoEditor).not.toBeNull();

      const textArea = monacoEditor!.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textArea).not.toBeNull();
      expect(textArea.value).toBe('{\n  "$each_t": "$__interval"\n}\n');

      const exampleText = container.querySelector(".jsonExample");
      expect(exampleText).not.toBeNull();
      expect(exampleText!.textContent).toContain("Example:");
    });

    it("should call bucket.query with default $each_t when condition", async () => {
      const fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton).not.toBeNull();

      await act(async () => {
        fireEvent.click(fetchButton);
        vi.runOnlyPendingTimers();
      });

      expect(bucket.query).toHaveBeenCalledWith(
        "testEntry",
        0n,
        3600000000n,
        expect.objectContaining({
          head: true,
          strict: true,
          when: expect.objectContaining({
            $each_t: "30s",
          }),
        }),
      );
    });
  });

  describe("Query Cancellation", () => {
    it("should show Cancel button after delay during long query", async () => {
      let queryResolve: () => void;
      const slowQueryPromise = new Promise<void>((resolve) => {
        queryResolve = resolve;
      });

      bucket.query = vi.fn().mockImplementation(() => ({
        async *[Symbol.asyncIterator]() {
          await slowQueryPromise;
          for (const record of mockRecords) {
            yield record;
          }
        },
      }));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(container.querySelector(".ant-select")).not.toBeNull();
      });

      let fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton.textContent).toBe("Fetch Records");

      await act(async () => {
        fireEvent.click(fetchButton);
      });

      fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton.textContent).toBe("Fetch Records");

      // Advance past the 500ms delay
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      // Now button should show "Cancel"
      fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton.textContent).toBe("Cancel");

      await act(async () => {
        queryResolve!();
        vi.runAllTimers();
      });
    });

    it("should abort query when Cancel is clicked", async () => {
      bucket.query = vi.fn().mockImplementation(() => ({
        async *[Symbol.asyncIterator]() {
          for (const record of mockRecords) {
            yield record;
          }
          // Simulate a slow tail that keeps yielding
          while (true) {
            await new Promise((r) => setTimeout(r, 100));
            yield mockRecords[0];
          }
        },
      }));

      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(container.querySelector(".ant-select")).not.toBeNull();
      });

      let fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      await act(async () => {
        fireEvent.click(fetchButton);
        vi.advanceTimersByTime(100);
      });

      // Advance past delay to show Cancel
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton.textContent).toBe("Cancel");

      // Clicking Cancel should abort
      await act(async () => {
        fireEvent.click(fetchButton);
        vi.runAllTimers();
      });

      fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      expect(fetchButton.textContent).toBe("Fetch Records");
    });
  });

  it("should fetch and display records", async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0);
    });

    const rows = container.querySelectorAll(".ant-table-row");
    expect(rows.length).toBe(2);

    expect(rows[0].textContent).toContain("1970-01-01T00:00:00.001Z");
    expect(rows[0].textContent).toContain("1.0 KB");
    expect(rows[0].textContent).toContain("application/json");
    expect(rows[0].textContent).toContain("key: value");

    expect(rows[1].textContent).toContain("1970-01-01T00:00:00.002Z");
    expect(rows[1].textContent).toContain("2.0 KB");
    expect(rows[1].textContent).toContain("text/plain");
    expect(rows[1].textContent).toContain("type: test");
  });

  it("should toggle between ISO and Unix timestamps", async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0);
    });

    // Open the format select dropdown
    const formatSelect = container.querySelector(
      '[data-testid="format-select"] .ant-select-selector, [data-testid="format-select"] .ant-select-content',
    ) as HTMLElement;
    expect(formatSelect).not.toBeNull();

    await act(async () => {
      fireEvent.mouseDown(formatSelect);
    });

    // Click the "Unix" option in the dropdown portal
    await waitFor(() => {
      const options = document.querySelectorAll(".ant-select-item-option");
      expect(options.length).toBeGreaterThan(0);
    });

    const unixOption = Array.from(
      document.querySelectorAll(".ant-select-item-option"),
    ).find((el) => el.textContent === "Unix");
    expect(unixOption).toBeDefined();

    await act(async () => {
      fireEvent.click(unixOption!);
    });

    const rows = container.querySelectorAll(".ant-table-row");
    expect(rows[0].textContent).toContain("1000");
    expect(rows[1].textContent).toContain("2000");
  });

  it("should show a download icon for each record", async () => {
    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0);
    });
    const downloadIcons = container.querySelectorAll(".anticon-download");
    expect(downloadIcons.length).toBe(2);
  });

  it("should download records using share link", async () => {
    const mockShareLink = "http://localhost/download-link";
    (bucket as any).createQueryLink = vi.fn().mockResolvedValue(mockShareLink);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await act(async () => {
      vi.runOnlyPendingTimers();
    });
    await waitFor(() => {
      expect(
        container.querySelectorAll(".anticon-download").length,
      ).toBeGreaterThan(0);
    });

    const downloadIcon = container.querySelectorAll(
      ".anticon-download",
    )[0] as HTMLElement;
    expect(downloadIcon).not.toBeNull();
    await act(async () => {
      fireEvent.click(downloadIcon);
      vi.runAllTimers();
    });

    expect(bucket.createQueryLink).toHaveBeenCalledWith(
      "testEntry",
      0n,
      3600000000n,
      expect.objectContaining({
        head: false,
        strict: true,
        when: expect.objectContaining({
          $each_t: "30s",
        }),
      }),
      0,
      expect.any(Date),
      "testEntry-1000.json",
      "https://example.com",
    );
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  describe("Link Generation", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should show share icon for each record", () => {
      const shareIcons = container.querySelectorAll(".anticon-share-alt");
      expect(shareIcons.length).toBeGreaterThanOrEqual(mockRecords.length);
    });

    it("should generate and copy share link when confirmed", async () => {
      const mockLink = "http://localhost/share-link";
      (bucket as any).createQueryLink = vi.fn().mockResolvedValue(mockLink);

      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true,
      });

      // Click share icon, open modal
      const shareIcon = container.querySelectorAll(
        ".anticon-share-alt",
      )[0] as HTMLElement;
      await act(async () => {
        fireEvent.click(shareIcon);
        vi.runAllTimers();
      });

      // Click "Generate Link"
      const generateButton = Array.from(
        document.querySelectorAll("button"),
      ).find((btn) => btn.textContent?.includes("Generate"));
      expect(generateButton).toBeDefined();
      await act(async () => {
        fireEvent.click(generateButton!);
        vi.runAllTimers();
      });

      expect(bucket.createQueryLink).toHaveBeenCalledWith(
        "testEntry",
        0n,
        3600000000n,
        expect.objectContaining({
          head: false,
          strict: true,
          when: expect.objectContaining({
            $each_t: "30s",
          }),
        }),
        0,
        expect.any(Date),
        "testEntry-1000.json",
        "https://example.com",
      );
      const input = document.querySelector(
        'input[data-testid="generated-link"]',
      ) as HTMLInputElement;
      expect(input.value).toBe(mockLink);

      // Click "Copy"
      const copyButton = document.querySelector(
        'button[data-testid="copy-button"]',
      ) as HTMLElement;
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockLink);
      expect(message.success).toHaveBeenCalledWith("Link copied to clipboard");
    });
  });

  describe("Label Editing", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should have expandable rows for label editing", () => {
      // Verify expand icons are present in the table
      const expandIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon",
      );
      expect(expandIcons.length).toBeGreaterThan(0);
    });

    it("should render RecordPreview and EditRecordLabels components when row is expanded", async () => {
      // Click the expand icon on the first row
      const expandIcon = container.querySelector(
        ".ant-table-row-expand-icon",
      ) as HTMLElement;
      expect(expandIcon).not.toBeNull();

      await act(async () => {
        fireEvent.click(expandIcon);
        vi.runAllTimers();
      });

      // Verify the expanded row content is rendered
      const expandedRow = container.querySelector(".ant-table-expanded-row");
      expect(expandedRow).not.toBeNull();
    });

    it("should render EditRecordLabels as read-only when user lacks write permissions", async () => {
      const noWritePermissions = {
        fullAccess: false,
        write: [] as string[],
      };

      let noWriteContainer!: HTMLElement;
      await act(async () => {
        const result = render(
          <MemoryRouter>
            <EntryDetail
              client={client}
              permissions={noWritePermissions}
              apiUrl="https://example.com"
            />
          </MemoryRouter>,
        );
        noWriteContainer = result.container;
      });

      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      await waitFor(() => {
        expect(
          noWriteContainer.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });

      // Expand a row
      const expandIcon = noWriteContainer.querySelector(
        ".ant-table-row-expand-icon",
      ) as HTMLElement;
      expect(expandIcon).not.toBeNull();

      await act(async () => {
        fireEvent.click(expandIcon);
        vi.runAllTimers();
      });

      // The expanded row should exist, and delete icons should not be present
      // (since user has no write access)
      const expandedRow = noWriteContainer.querySelector(
        ".ant-table-expanded-row",
      );
      expect(expandedRow).not.toBeNull();

      // With read-only, there should be no "Add Label" button within the expanded row
      const addButtons = expandedRow!.querySelectorAll("button");
      const addLabelButton = Array.from(addButtons).find((btn) =>
        btn.textContent?.includes("Add Label"),
      );
      expect(addLabelButton).toBeUndefined();
    });
  });

  describe("Data Volume Chart", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should render the DataVolumeChart component", () => {
      const chart = container.querySelector(
        '[data-testid="data-volume-chart"]',
      );
      expect(chart).not.toBeNull();
    });

    it("should pass correct props to DataVolumeChart", () => {
      const chart = container.querySelector(
        '[data-testid="data-volume-chart"]',
      ) as HTMLElement;
      expect(chart).not.toBeNull();

      const chartData = JSON.parse(chart.getAttribute("data-chart-data")!);
      expect(chartData).toHaveProperty("datasets");
      expect(chartData.datasets).toHaveLength(1);
    });

    it("should show chart data when records are available", () => {
      const chart = container.querySelector(
        '[data-testid="data-volume-chart"]',
      ) as HTMLElement;
      expect(chart).not.toBeNull();

      const chartData = JSON.parse(chart.getAttribute("data-chart-data")!);
      expect(chartData.datasets[0].data.length).toBeGreaterThan(0);
    });
  });

  describe("When Condition", () => {
    it("should initialize with default $each_t macro", async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      // Check the Monaco editor component value
      const monacoEditor = container.querySelector(".monaco-editor-mock");
      expect(monacoEditor).not.toBeNull();

      const textArea = monacoEditor!.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      expect(textArea).not.toBeNull();

      const conditionValue = textArea.value;
      expect(conditionValue).toBeDefined();
      expect(typeof conditionValue).toBe("string");
      expect(conditionValue).toContain("$each_t");
      expect(() => JSON.parse(conditionValue)).not.toThrow();

      const parsed = JSON.parse(conditionValue);
      expect(parsed).toHaveProperty("$each_t");
      expect(typeof parsed["$each_t"]).toBe("string");
      expect(parsed["$each_t"]).toBe("$__interval");
    });

    it("should keep $each_t macro when time range changes", async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      // After render, the condition should contain the default macro
      const updatedMonacoEditor = container.querySelector(
        ".monaco-editor-mock",
      );
      const updatedTextArea = updatedMonacoEditor!.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      const updatedConditionValue = updatedTextArea.value;

      expect(updatedConditionValue.trim()).toBe(
        '{\n  "$each_t": "$__interval"\n}',
      );
    });

    it("should not auto-update when condition contains other fields", async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });

      // Set a custom condition with additional fields
      const customCondition = {
        $each_t: "1m",
        "&label": { $eq: "test" },
      };

      const monacoEditor = container.querySelector(".monaco-editor-mock");
      const textArea = monacoEditor!.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;

      await act(async () => {
        fireEvent.change(textArea, {
          target: { value: JSON.stringify(customCondition, null, 2) },
        });
      });

      // The condition should remain unchanged
      const finalMonacoEditor = container.querySelector(".monaco-editor-mock");
      const finalTextArea = finalMonacoEditor!.querySelector(
        "textarea",
      ) as HTMLTextAreaElement;
      const finalCondition = JSON.parse(finalTextArea.value);

      expect(finalCondition).toEqual(customCondition);
    });
  });

  describe("Record Deletion", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should show delete icon for each record", () => {
      const deleteIcons = container.querySelectorAll(".anticon-delete");
      expect(deleteIcons.length).toBeGreaterThanOrEqual(mockRecords.length);
    });

    it("should open delete confirmation modal when delete icon is clicked", async () => {
      const [recordRow] = container.querySelectorAll(".ant-table-row");
      expect(recordRow).not.toBeNull();

      const deleteIcon = recordRow.querySelector(
        ".anticon-delete",
      ) as HTMLElement;
      expect(deleteIcon).not.toBeNull();

      await act(async () => {
        fireEvent.click(deleteIcon);
      });

      const modal = document.querySelector(".ant-modal");
      expect(modal).not.toBeNull();

      // Check the modal title
      const modalTitle = modal!.querySelector(".ant-modal-title");
      expect(modalTitle!.textContent).toContain("Delete Record");
    });

    it("should delete record when confirmation is confirmed", async () => {
      vi.clearAllMocks();

      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });

      bucket.removeRecord = vi.fn().mockResolvedValue(undefined);
      message.success = vi.fn();
      (client.getBucket as Mock).mockResolvedValue(bucket);

      const [recordRow] = container.querySelectorAll(".ant-table-row");
      expect(recordRow).not.toBeNull();

      const deleteIcon = recordRow.querySelector(
        ".anticon-delete",
      ) as HTMLElement;
      expect(deleteIcon).not.toBeNull();

      await act(async () => {
        fireEvent.click(deleteIcon);
      });

      const modal = document.querySelector(".ant-modal");
      expect(modal).not.toBeNull();

      const modalTitle = modal!.querySelector(".ant-modal-title");
      expect(modalTitle!.textContent).toBe("Delete Record");

      const modalFooter = modal!.querySelector(".ant-modal-footer");
      expect(modalFooter).not.toBeNull();

      const buttons = modalFooter!.querySelectorAll("button");
      expect(buttons.length).toBe(2);

      const [, deleteButton] = buttons;
      expect(deleteButton).not.toBeNull();

      await act(async () => {
        fireEvent.click(deleteButton);
        vi.runAllTimers();
      });

      expect(bucket.removeRecord).toHaveBeenCalledWith("testEntry", 1000n);
      expect(message.success).toHaveBeenCalledWith(
        "Record deleted successfully",
      );
    });
  });

  describe("Time Range Input", () => {
    beforeEach(async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(
          container.querySelectorAll(".ant-table-row").length,
        ).toBeGreaterThan(0);
      });
    });

    it("should query with undefined end time when stop field is empty", async () => {
      (bucket.query as Mock).mockClear();

      const stopInput = container.querySelector(
        'input[placeholder="Stop time (optional)"]',
      ) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(stopInput, { target: { value: "" } });
      });

      const fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      await act(async () => {
        fireEvent.click(fetchButton);
        vi.runAllTimers();
      });

      expect(bucket.query).toHaveBeenCalledWith(
        "testEntry",
        0n,
        undefined,
        expect.objectContaining({
          head: true,
          strict: true,
        }),
      );
    });

    it("should query with specific end time when stop field has value", async () => {
      (bucket.query as Mock).mockClear();

      const stopInput = container.querySelector(
        'input[placeholder="Stop time (optional)"]',
      ) as HTMLInputElement;

      const specificTime = "1970-01-01T00:00:01.000Z";
      await act(async () => {
        fireEvent.change(stopInput, { target: { value: specificTime } });
      });

      const fetchButton = container.querySelector(
        ".fetchButton button",
      ) as HTMLElement;
      await act(async () => {
        fireEvent.click(fetchButton);
        vi.runAllTimers();
      });

      expect(bucket.query).toHaveBeenCalled();
      const [[entry, startTime, endTime, options]] = (bucket.query as Mock).mock
        .calls;

      expect(entry).toBe("testEntry");
      expect(startTime).toBe(0n);
      expect(endTime).toBe(1000000n);

      expect(options).toMatchObject({
        head: true,
        strict: true,
      });
    });
  });

  describe("Sub-entry Warning", () => {
    it("should not show warning when entry has no sub-entries", async () => {
      await act(async () => {
        vi.runOnlyPendingTimers();
      });
      await waitFor(() => {
        expect(container.querySelector(".EntryCard")).not.toBeNull();
      });

      const alert = container.querySelector(".ant-alert");
      expect(alert).toBeNull();
    });

    it("should show warning when entry has sub-entries", async () => {
      bucket.getEntryList = vi.fn().mockResolvedValue([
        {
          name: "testEntry",
          blockCount: 5n,
          recordCount: 100n,
          size: 1024n,
          oldestRecord: 0n,
          latestRecord: 10000n,
          status: Status.READY,
        } as EntryInfo,
        {
          name: "testEntry/child1",
          blockCount: 2n,
          recordCount: 50n,
          size: 512n,
          oldestRecord: 0n,
          latestRecord: 5000n,
          status: Status.READY,
        } as EntryInfo,
      ]);

      let subContainer: HTMLElement;
      await act(async () => {
        const result = render(
          <MemoryRouter>
            <EntryDetail
              client={client}
              permissions={permissions}
              apiUrl="https://example.com"
            />
          </MemoryRouter>,
        );
        subContainer = result.container;
      });

      await act(async () => {
        vi.runAllTimers();
      });

      // Wait for the getEntryList promise to resolve
      await act(async () => {
        vi.runAllTimers();
      });

      expect(subContainer!.textContent).toContain("sub-entries");
    });
  });
});
