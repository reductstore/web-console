import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import BucketEntriesTable, { EntryTableRow } from "./BucketEntriesTable";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { ColumnsType } from "antd/es/table";

// Helper to flush requestAnimationFrame callbacks
const flushRAF = async () => {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });
};

describe("BucketEntriesTable", () => {
  let wrapper: ReactWrapper;

  const columns: ColumnsType<EntryTableRow> = [
    { title: "Name", dataIndex: "fullName", key: "name" },
  ];

  const mockRows: EntryTableRow[] = [
    {
      key: "folder1",
      fullName: "folder1/",
      children: [
        { key: "folder1/file1.txt", fullName: "folder1/file1.txt" },
        { key: "folder1/file2.txt", fullName: "folder1/file2.txt" },
      ],
    },
    {
      key: "folder2",
      fullName: "folder2/",
      children: [
        { key: "folder2/data.json", fullName: "folder2/data.json" },
        {
          key: "folder2/nested",
          fullName: "folder2/nested/",
          children: [
            {
              key: "folder2/nested/deep.txt",
              fullName: "folder2/nested/deep.txt",
            },
          ],
        },
      ],
    },
    { key: "root.txt", fullName: "root.txt" },
  ];

  const defaultProps = {
    rows: mockRows,
    columns,
    loading: false,
    pathQuery: "",
    currentPage: 1,
    pageSize: 10,
    onTableChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("Rendering", () => {
    it("should render ScrollableTable with correct props", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} />);

      const table = wrapper.find("ScrollableTable");
      expect(table.exists()).toBe(true);
      expect(table.prop("className")).toBe("entriesTable");
      expect(table.prop("rowKey")).toBe("key");
      expect(table.prop("loading")).toBe(false);
    });

    it("should render all rows when no filter is applied", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} />);

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(3);
    });

    it("should show loading state", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} loading={true} />);

      const table = wrapper.find("ScrollableTable");
      expect(table.prop("loading")).toBe(true);
    });

    it("should pass pagination props correctly", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} currentPage={2} pageSize={20} />,
      );

      const table = wrapper.find("ScrollableTable");
      const pagination = table.prop("pagination") as {
        current: number;
        pageSize: number;
        showSizeChanger: boolean;
      };
      expect(pagination.current).toBe(2);
      expect(pagination.pageSize).toBe(20);
      expect(pagination.showSizeChanger).toBe(true);
    });
  });

  describe("Filtering", () => {
    it("should filter rows based on pathQuery", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} pathQuery="file1" />,
      );

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(1);
      expect(dataSource[0].key).toBe("folder1");
      expect(dataSource[0].children).toHaveLength(1);
      expect(dataSource[0].children?.[0].key).toBe("folder1/file1.txt");
    });

    it("should filter nested children", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} pathQuery="deep" />,
      );

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(1);
      expect(dataSource[0].key).toBe("folder2");
      expect(dataSource[0].children).toHaveLength(1);
      expect(dataSource[0].children?.[0].key).toBe("folder2/nested");
    });

    it("should be case insensitive", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} pathQuery="FILE1" />,
      );

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(1);
      expect(dataSource[0].children?.[0].fullName).toBe("folder1/file1.txt");
    });

    it("should return all rows when pathQuery is empty", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} pathQuery="   " />);

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(3);
    });

    it("should match parent folder names", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} pathQuery="folder1" />,
      );

      const table = wrapper.find("ScrollableTable");
      const dataSource = table.prop("dataSource") as EntryTableRow[];
      expect(dataSource).toHaveLength(1);
      expect(dataSource[0].key).toBe("folder1");
      expect(dataSource[0].children).toHaveLength(2);
    });
  });

  describe("Expandable rows", () => {
    it("should have expandable configuration", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} />);

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        expandedRowKeys: string[];
        rowExpandable: (row: EntryTableRow) => boolean;
      };
      expect(expandable).toBeDefined();
      expect(expandable.rowExpandable).toBeDefined();
    });

    it("should mark rows with children as expandable", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} />);

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        rowExpandable: (row: EntryTableRow) => boolean;
      };

      expect(expandable.rowExpandable(mockRows[0])).toBe(true);
      expect(expandable.rowExpandable(mockRows[2])).toBe(false);
    });

    it("should auto-expand all rows when searching", () => {
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} pathQuery="file" />,
      );

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        expandedRowKeys: string[];
      };
      expect(expandable.expandedRowKeys.length).toBeGreaterThan(0);
    });

    it("should start with no rows expanded when not searching", () => {
      wrapper = mount(<BucketEntriesTable {...defaultProps} />);

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        expandedRowKeys: string[];
      };
      expect(expandable.expandedRowKeys).toHaveLength(0);
    });
  });

  describe("Expand/Collapse signals", () => {
    it("should expand all rows when expand signal is triggered", async () => {
      wrapper = mount(
        <BucketEntriesTable
          {...defaultProps}
          expandCollapseSignal={1}
          expandCollapseTarget="expand"
        />,
      );

      await flushRAF();
      wrapper.update();

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        expandedRowKeys: string[];
      };
      expect(expandable.expandedRowKeys).toContain("folder1");
      expect(expandable.expandedRowKeys).toContain("folder2");
      expect(expandable.expandedRowKeys).toContain("folder2/nested");
    });

    it("should collapse all rows when collapse signal is triggered", async () => {
      wrapper = mount(
        <BucketEntriesTable
          {...defaultProps}
          expandCollapseSignal={1}
          expandCollapseTarget="expand"
        />,
      );

      await flushRAF();
      wrapper.update();

      wrapper.setProps({
        expandCollapseSignal: 2,
        expandCollapseTarget: "collapse",
      });

      await flushRAF();
      wrapper.update();

      const table = wrapper.find("ScrollableTable");
      const expandable = table.prop("expandable") as {
        expandedRowKeys: string[];
      };
      expect(expandable.expandedRowKeys).toHaveLength(0);
    });
  });

  describe("onExpandedStatsChange callback", () => {
    it("should call onExpandedStatsChange with correct counts", async () => {
      const onExpandedStatsChange = jest.fn();
      wrapper = mount(
        <BucketEntriesTable
          {...defaultProps}
          onExpandedStatsChange={onExpandedStatsChange}
        />,
      );

      await flushRAF();

      expect(onExpandedStatsChange).toHaveBeenCalledWith(0, 3);
    });

    it("should report all expanded when searching", async () => {
      const onExpandedStatsChange = jest.fn();
      wrapper = mount(
        <BucketEntriesTable
          {...defaultProps}
          pathQuery="file"
          onExpandedStatsChange={onExpandedStatsChange}
        />,
      );

      await flushRAF();

      const lastCall =
        onExpandedStatsChange.mock.calls[
          onExpandedStatsChange.mock.calls.length - 1
        ];
      expect(lastCall[0]).toEqual(lastCall[1]);
    });
  });

  describe("Table change handler", () => {
    it("should call onTableChange when pagination changes", () => {
      const onTableChange = jest.fn();
      wrapper = mount(
        <BucketEntriesTable {...defaultProps} onTableChange={onTableChange} />,
      );

      const table = wrapper.find("ScrollableTable");
      const onChange = table.prop("onChange") as unknown as (pagination: {
        current: number;
        pageSize: number;
      }) => void;
      onChange({ current: 2, pageSize: 20 });

      expect(onTableChange).toHaveBeenCalledWith({ current: 2, pageSize: 20 });
    });
  });
});
