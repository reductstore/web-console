import { useState, useCallback, useMemo } from "react";
import type { TableProps } from "antd";

export interface UseSelectionModeResult<T = any> {
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
  clearSelection: () => void;
  rowSelection: TableProps<T>["rowSelection"];
}

interface UseSelectionModeOptions {
  getDisabledKeys?: () => string[];
}

export function useSelectionMode<T = any>(
  options?: UseSelectionModeOptions,
): UseSelectionModeResult<T> {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const clearSelection = useCallback(() => {
    setSelectedKeys([]);
  }, []);

  const disabledKeys = options?.getDisabledKeys?.() ?? [];

  const rowSelection: TableProps<T>["rowSelection"] = useMemo(
    () => ({
      selectedRowKeys: selectedKeys,
      onChange: (keys: React.Key[]) => {
        setSelectedKeys(keys as string[]);
      },
      getCheckboxProps: (record: any) => ({
        disabled: disabledKeys.includes(record.key ?? record.name),
      }),
    }),
    [selectedKeys, disabledKeys],
  );

  return {
    selectedKeys,
    setSelectedKeys,
    clearSelection,
    rowSelection,
  };
}
