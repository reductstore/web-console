import { renderHook, act } from "@testing-library/react";
import { useSelectionMode } from "./useSelectionMode";

describe("useSelectionMode", () => {
  it("should start with empty keys and rowSelection defined", () => {
    const { result } = renderHook(() => useSelectionMode());
    expect(result.current.selectedKeys).toEqual([]);
    expect(result.current.rowSelection).toBeDefined();
  });

  it("should provide rowSelection with selectedRowKeys", () => {
    const { result } = renderHook(() => useSelectionMode());
    act(() => result.current.setSelectedKeys(["key1", "key2"]));
    expect(result.current.rowSelection?.selectedRowKeys).toEqual([
      "key1",
      "key2",
    ]);
  });

  it("should disable rows via getDisabledKeys", () => {
    const { result } = renderHook(() =>
      useSelectionMode({
        getDisabledKeys: () => ["disabled1"],
      }),
    );
    const checkboxProps = result.current.rowSelection?.getCheckboxProps?.({
      name: "disabled1",
    } as any);
    expect(checkboxProps?.disabled).toBe(true);
  });

  it("should not disable non-disabled rows", () => {
    const { result } = renderHook(() =>
      useSelectionMode({
        getDisabledKeys: () => ["disabled1"],
      }),
    );
    const checkboxProps = result.current.rowSelection?.getCheckboxProps?.({
      name: "enabled1",
    } as any);
    expect(checkboxProps?.disabled).toBe(false);
  });

  it("clearSelection should empty the keys", () => {
    const { result } = renderHook(() => useSelectionMode());
    act(() => result.current.setSelectedKeys(["a"]));
    act(() => result.current.clearSelection());
    expect(result.current.selectedKeys).toEqual([]);
  });
});
