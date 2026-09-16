import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Mock } from "vitest";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import QuerySelector from "./QuerySelector";
import { useQueryStore } from "../../stores/queryStore";

vi.setConfig({ testTimeout: 15000 });

describe("QuerySelector", () => {
  let onLoadQuery: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    useQueryStore.getState().clearQueries();

    onLoadQuery = vi.fn();
  });

  const renderSelector = (
    editable = true,
    queries: Array<{ name: string; query: string }> = [],
    loadedQueryName: string | null = null,
  ) => {
    for (const q of queries) {
      useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
        name: q.name,
        query: q.query,
      });
    }

    return render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        loadedQueryName={loadedQueryName}
        editable={editable}
      />,
    );
  };

  it("renders nothing when no saved queries exist", () => {
    const { container } = renderSelector();
    expect(container.querySelector(".ant-select")).toBeNull();
  });

  it("renders select dropdown when queries exist", () => {
    const { container } = renderSelector(true, [
      { name: "my-query", query: '{"$each_t": "1s"}' },
    ]);

    expect(container.querySelector(".ant-select")).toBeTruthy();
  });

  it("shows queries from store", () => {
    renderSelector(true, [{ name: "q1", query: "{}" }]);

    const queries = useQueryStore
      .getState()
      .getQueries("test-bucket", "test-entry");
    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe("q1");
  });

  it("hides delete buttons when not editable", () => {
    renderSelector(false, [{ name: "q1", query: "{}" }]);

    expect(screen.queryByTestId("delete-query-q1")).toBeNull();
  });

  it("never calls onLoadQuery just from rendering with a loaded query name", () => {
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "q1",
      query: '{"$each_t": "5s"}',
    });

    render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        loadedQueryName="q1"
        editable={true}
      />,
    );

    expect(onLoadQuery).not.toHaveBeenCalled();
  });

  it("shows queries from other buckets grouped by bucket/entry, with a delete button, when showAllQueries is on", () => {
    useQueryStore.getState().saveQuery("other-bucket", "other-entry", {
      name: "other-query",
      query: "{}",
    });

    const { container } = render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        loadedQueryName={null}
        editable={true}
        showAllQueries={true}
      />,
    );

    fireEvent.mouseDown(container.querySelector(".ant-select")!);

    expect(screen.getByText("other-query")).toBeTruthy();
    expect(screen.getByText("other-bucket/other-entry")).toBeTruthy();
    expect(screen.getByTestId("delete-query-other-query")).toBeTruthy();
  });

  it("calls onClearQuery when the loaded query is cleared from the dropdown", () => {
    const onClearQuery = vi.fn();
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "q1",
      query: '{"$each_t": "5s"}',
    });

    const { container } = render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        onClearQuery={onClearQuery}
        loadedQueryName="q1"
        editable={true}
      />,
    );

    const clearIcon = container.querySelector(".ant-select-clear");
    expect(clearIcon).toBeTruthy();
    fireEvent.click(clearIcon!);

    expect(onClearQuery).toHaveBeenCalled();
  });

  it("reports the query's own bucket/entry when deleting a current-bucket query", () => {
    const onQueryDeleted = vi.fn();
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "q1",
      query: "{}",
    });

    const { container } = render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        onQueryDeleted={onQueryDeleted}
        loadedQueryName={null}
        editable={true}
      />,
    );

    fireEvent.mouseDown(container.querySelector(".ant-select")!);
    fireEvent.click(screen.getByTestId("delete-query-q1"));
    fireEvent.click(screen.getByText("Delete"));

    expect(onQueryDeleted).toHaveBeenCalledWith(
      "test-bucket",
      ["test-entry"],
      "q1",
    );
  });

  it("reports the source bucket/entry when deleting a query from another group", () => {
    const onQueryDeleted = vi.fn();
    useQueryStore.getState().saveQuery("other-bucket", "other-entry", {
      name: "other-query",
      query: "{}",
      bucketName: "other-bucket",
      entries: ["other-entry"],
    });

    const { container } = render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        onQueryDeleted={onQueryDeleted}
        loadedQueryName={null}
        editable={true}
        showAllQueries={true}
      />,
    );

    fireEvent.mouseDown(container.querySelector(".ant-select")!);
    fireEvent.click(screen.getByTestId("delete-query-other-query"));
    fireEvent.click(screen.getByText("Delete"));

    expect(onQueryDeleted).toHaveBeenCalledWith(
      "other-bucket",
      ["other-entry"],
      "other-query",
    );
  });
});
