import React from "react";
import { render, screen } from "@testing-library/react";
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
  ) => {
    for (const q of queries) {
      useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
        name: q.name,
        query: q.query,
      });
    }
    useQueryStore
      .getState()
      .setLoadedQueryName("test-bucket", "test-entry", null);

    return render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
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

  it("auto-loads last used query on mount", () => {
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "q1",
      query: '{"$each_t": "5s"}',
    });
    useQueryStore
      .getState()
      .setLoadedQueryName("test-bucket", "test-entry", "q1");

    render(
      <QuerySelector
        bucketName="test-bucket"
        entryName="test-entry"
        onLoadQuery={onLoadQuery}
        editable={true}
      />,
    );

    expect(onLoadQuery).toHaveBeenCalledWith(
      expect.objectContaining({ name: "q1", query: '{"$each_t": "5s"}' }),
    );
    expect(
      useQueryStore.getState().getLoadedQueryName("test-bucket", "test-entry"),
    ).toBe("q1");
  });
});
