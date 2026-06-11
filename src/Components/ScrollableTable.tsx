import React, { useMemo } from "react";
import { Table } from "antd";
import type { TableProps } from "antd";

type ScrollableTableProps<T = any> = TableProps<T> & {
  children?: React.ReactNode;
};

/**
 * Prevents "ResizeObserver loop" warning by only applying `scroll` prop
 * when the table has data or a custom body component.
 */
function ScrollableTable<T extends object = any>({
  children: childrenProp,
  ...restProps
}: ScrollableTableProps<T>) {
  const scroll = useMemo(() => {
    if (
      (restProps.components?.body || restProps.dataSource?.length) &&
      restProps.scroll
    ) {
      return restProps.scroll;
    }
    return undefined;
  }, [restProps]);

  return (
    <Table<T> {...restProps} scroll={scroll}>
      {childrenProp}
    </Table>
  );
}

export default ScrollableTable;
