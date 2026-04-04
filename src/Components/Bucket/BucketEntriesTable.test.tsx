import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
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
    onTableChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
  });

  describe("Rendering", () => {
    it("should render ScrollableTable with correct props", () => {
      const { container } = render(<BucketEntriesTable {...defaultProps} />);

      expect(container.querySelector(".entriesTable")).toBeTruthy();
      expect(container.querySelector(".ant-spin-spinning")).toBeFalsy();
    });

    it("should render all rows when no filter is applied", () => {
      const { container } = render(<BucketEntriesTable {...defaultProps} />);

      const rows = container.querySelectorAll("tr.ant-table-row-level-0");
      expect(rows).toHaveLength(3);
    });

    it("should show loading state", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} loading={true} />,
      );

      expect(container.querySelector(".ant-spin-spinning")).toBeTruthy();
    });

    it("should pass pagination props correctly", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} currentPage={2} pageSize={20} />,
      );

      const pagination = container.querySelector(".ant-pagination");
      expect(pagination).toBeTruthy();
      const sizeChanger = container.querySelector(
        ".ant-pagination-options .ant-select",
      );
      expect(sizeChanger).toBeTruthy();
    });
  });

  describe("Filtering", () => {
    it("should filter rows based on pathQuery", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="file1" />,
      );

      // When searching, rows are auto-expanded
      // "file1" matches folder1/file1.txt only
      const level0Rows = container.querySelectorAll("tr.ant-table-row-level-0");
      expect(level0Rows).toHaveLength(1);
      expect(level0Rows[0].textContent).toContain("folder1/");

      const level1Rows = container.querySelectorAll("tr.ant-table-row-level-1");
      expect(level1Rows).toHaveLength(1);
      expect(level1Rows[0].textContent).toContain("folder1/file1.txt");
    });

    it("should filter nested children", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="deep" />,
      );

      const level0Rows = container.querySelectorAll("tr.ant-table-row-level-0");
      expect(level0Rows).toHaveLength(1);
      expect(level0Rows[0].textContent).toContain("folder2/");

      const level1Rows = container.querySelectorAll("tr.ant-table-row-level-1");
      expect(level1Rows).toHaveLength(1);
      expect(level1Rows[0].textContent).toContain("folder2/nested/");
    });

    it("should be case insensitive", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="FILE1" />,
      );

      const level1Rows = container.querySelectorAll("tr.ant-table-row-level-1");
      expect(level1Rows).toHaveLength(1);
      expect(level1Rows[0].textContent).toContain("folder1/file1.txt");
    });

    it("should return all rows when pathQuery is empty", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="   " />,
      );

      const level0Rows = container.querySelectorAll("tr.ant-table-row-level-0");
      expect(level0Rows).toHaveLength(3);
    });

    it("should match parent folder names", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="folder1" />,
      );

      // folder1/ matches, so it and all children are included
      const level0Rows = container.querySelectorAll("tr.ant-table-row-level-0");
      expect(level0Rows).toHaveLength(1);
      expect(level0Rows[0].textContent).toContain("folder1/");

      const level1Rows = container.querySelectorAll("tr.ant-table-row-level-1");
      expect(level1Rows).toHaveLength(2);
    });
  });

  describe("Expandable rows", () => {
    it("should have expandable configuration", () => {
      const { container } = render(<BucketEntriesTable {...defaultProps} />);

      // Expand icons should be present for expandable rows
      const expandIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon",
      );
      expect(expandIcons.length).toBeGreaterThan(0);
    });

    it("should mark rows with children as expandable", () => {
      const { container } = render(<BucketEntriesTable {...defaultProps} />);

      // folder1 and folder2 have children → collapsed expand icons
      const collapsedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-collapsed",
      );
      expect(collapsedIcons).toHaveLength(2);

      // root.txt has no children → spacer icon
      const spacerIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-spaced",
      );
      expect(spacerIcons).toHaveLength(1);
    });

    it("should auto-expand all rows when searching", () => {
      const { container } = render(
        <BucketEntriesTable {...defaultProps} pathQuery="file" />,
      );

      // When searching, expandable rows are auto-expanded
      const expandedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-expanded",
      );
      expect(expandedIcons.length).toBeGreaterThan(0);
    });

    it("should start with no rows expanded when not searching", () => {
      const { container } = render(<BucketEntriesTable {...defaultProps} />);

      const expandedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-expanded",
      );
      expect(expandedIcons).toHaveLength(0);

      // Only level-0 rows should be visible
      const level1Rows = container.querySelectorAll("tr.ant-table-row-level-1");
      expect(level1Rows).toHaveLength(0);
    });
  });

  describe("Expand/Collapse signals", () => {
    it("should expand all rows when expand signal is triggered", async () => {
      const { container } = render(
        <BucketEntriesTable
          {...defaultProps}
          expandCollapseSignal={1}
          expandCollapseTarget="expand"
        />,
      );

      await flushRAF();

      // folder1, folder2, folder2/nested should all be expanded
      const expandedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-expanded",
      );
      expect(expandedIcons).toHaveLength(3);
    });

    it("should collapse all rows when collapse signal is triggered", async () => {
      const { rerender, container } = render(
        <BucketEntriesTable
          {...defaultProps}
          expandCollapseSignal={1}
          expandCollapseTarget="expand"
        />,
      );

      await flushRAF();

      rerender(
        <BucketEntriesTable
          {...defaultProps}
          expandCollapseSignal={2}
          expandCollapseTarget="collapse"
        />,
      );

      await flushRAF();

      const expandedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon-expanded",
      );
      expect(expandedIcons).toHaveLength(0);
    });
  });

  describe("onExpandedStatsChange callback", () => {
    it("should call onExpandedStatsChange with correct counts", async () => {
      const onExpandedStatsChange = vi.fn();
      render(
        <BucketEntriesTable
          {...defaultProps}
          onExpandedStatsChange={onExpandedStatsChange}
        />,
      );

      await flushRAF();

      expect(onExpandedStatsChange).toHaveBeenCalledWith(0, 3);
    });

    it("should report all expanded when searching", async () => {
      const onExpandedStatsChange = vi.fn();
      render(
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
      const onTableChange = vi.fn();
      const { container } = render(
        <BucketEntriesTable
          {...defaultProps}
          pageSize={2}
          onTableChange={onTableChange}
        />,
      );

      // With 3 items and pageSize=2, page 2 should exist
      const page2Button = container.querySelector(".ant-pagination-item-2");
      expect(page2Button).toBeTruthy();
      fireEvent.click(page2Button!);

      expect(onTableChange).toHaveBeenCalled();
      const [[paginationArg]] = onTableChange.mock.calls;
      expect(paginationArg.current).toBe(2);
      expect(paginationArg.pageSize).toBe(2);
    });
  });
});
