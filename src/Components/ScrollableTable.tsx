import React, { useMemo } from "react";
import { Table } from "antd";

interface ScrollableTableProps {
  children?: React.ReactNode;
  [key: string]: any;
}

/**
 * Prevents "ResizeObserver loop" warning by only applying `scroll` prop
 * when the table has data or a custom body component.
 */
const ScrollableTable = ({
  children: childrenProp,
  ...restProps
}: ScrollableTableProps) => {
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
    <Table {...restProps} scroll={scroll}>
      {childrenProp}
    </Table>
  );
};

export default ScrollableTable;
