import React, { useEffect, useMemo, useState } from "react";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import ScrollableTable from "../ScrollableTable";

export interface EntryTableRow {
  key: string;
  fullName: string;
  children?: EntryTableRow[];
}

interface Props<T extends EntryTableRow> {
  rows: T[];
  columns: ColumnsType<T>;
  loading: boolean;
  pathQuery: string;
  currentPage: number;
  pageSize: number;
  onTableChange: (tablePagination: TablePaginationConfig) => void;
  expandCollapseSignal?: number;
  expandCollapseTarget?: "expand" | "collapse";
  onExpandedStatsChange?: (openCount: number, totalCount: number) => void;
}

const collectExpandableKeys = <T extends EntryTableRow>(
  nodes: T[],
): string[] => {
  const keys: string[] = [];
  const walk = (list: T[]) => {
    for (const node of list) {
      if (node.children?.length) {
        keys.push(node.key);
        walk(node.children as T[]);
      }
    }
  };
  walk(nodes);
  return keys;
};

export default function BucketEntriesTable<T extends EntryTableRow>(
  props: Readonly<Props<T>>,
) {
  const filteredRows = useMemo(() => {
    const q = props.pathQuery.trim().toLowerCase();
    if (!q) return props.rows;

    const filterTree = (nodes: T[]): T[] => {
      const acc: T[] = [];
      for (const node of nodes) {
        const matched = node.fullName.toLowerCase().includes(q);
        const children = node.children?.length
          ? filterTree(node.children as T[])
          : [];
        if (matched || children.length) {
          acc.push({
            ...node,
            children: children.length ? children : undefined,
          } as T);
        }
      }
      return acc;
    };

    return filterTree(props.rows);
  }, [props.pathQuery, props.rows]);

  const isSearching = props.pathQuery.trim().length > 0;

  const allExpandableKeys = useMemo(
    () => collectExpandableKeys(filteredRows),
    [filteredRows],
  );
  const [userExpandedKeys, setUserExpandedKeys] = useState<string[]>([]);

  useEffect(() => {
    const { onExpandedStatsChange } = props;
    if (!onExpandedStatsChange) return;
    const openCount = isSearching
      ? allExpandableKeys.length
      : userExpandedKeys.length;
    const rafId = requestAnimationFrame(() => {
      onExpandedStatsChange(openCount, allExpandableKeys.length);
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    props.onExpandedStatsChange,
    isSearching,
    allExpandableKeys,
    userExpandedKeys,
  ]);

  useEffect(() => {
    if (props.expandCollapseSignal === undefined) return;
    const rafId = requestAnimationFrame(() => {
      if (props.expandCollapseTarget === "expand") {
        setUserExpandedKeys(allExpandableKeys);
      } else if (props.expandCollapseTarget === "collapse") {
        setUserExpandedKeys([]);
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [
    props.expandCollapseSignal,
    props.expandCollapseTarget,
    allExpandableKeys,
  ]);

  const expandedRowKeys = useMemo(() => {
    if (isSearching) {
      return allExpandableKeys;
    }
    return userExpandedKeys;
  }, [isSearching, allExpandableKeys, userExpandedKeys]);

  return (
    <ScrollableTable
      scroll={{ x: "max-content" }}
      className="entriesTable"
      columns={props.columns as any[]}
      dataSource={filteredRows}
      loading={props.loading}
      rowKey="key"
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: (keys: readonly React.Key[]) => {
          if (!isSearching) {
            setUserExpandedKeys(keys as string[]);
          }
        },
        rowExpandable: (row: T) => Boolean(row.children?.length),
      }}
      pagination={{
        current: props.currentPage,
        pageSize: props.pageSize,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
      onChange={props.onTableChange}
    />
  );
}
