import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import { Select } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import QuerySelector from "./QuerySelector";
import { useQueryStore } from "../../stores/queryStore";

jest.setTimeout(15000);

const flush = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("QuerySelector", () => {
  let wrapper: ReactWrapper;
  let onLoadQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    useQueryStore.getState().clearQueries();

    onLoadQuery = jest.fn();
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  const mountSelector = async (
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

    await act(async () => {
      wrapper = mount(
        <QuerySelector
          bucketName="test-bucket"
          entryName="test-entry"
          defaultQuery='{"$each_t": "$__interval"}'
          onLoadQuery={onLoadQuery}
          editable={editable}
        />,
      );
      await flush();
    });
    wrapper.update();
  };

  it("renders nothing when no saved queries exist", async () => {
    await mountSelector();
    expect(wrapper.find(Select).length).toBe(0);
  });

  it("renders select dropdown when queries exist", async () => {
    await mountSelector(true, [
      { name: "my-query", query: '{"$each_t": "1s"}' },
    ]);

    expect(wrapper.find(Select).length).toBe(1);
  });

  it("shows queries from store", async () => {
    await mountSelector(true, [{ name: "q1", query: "{}" }]);

    const queries = useQueryStore
      .getState()
      .getQueries("test-bucket", "test-entry");
    expect(queries).toHaveLength(1);
    expect(queries[0].name).toBe("q1");
  });

  it("hides delete buttons when not editable", async () => {
    await mountSelector(false, [{ name: "q1", query: "{}" }]);

    expect(
      wrapper.find('[data-testid="delete-query-q1"]').hostNodes().length,
    ).toBe(0);
  });

  it("auto-loads last used query on mount", async () => {
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "q1",
      query: '{"$each_t": "5s"}',
    });
    useQueryStore
      .getState()
      .setLoadedQueryName("test-bucket", "test-entry", "q1");

    await act(async () => {
      wrapper = mount(
        <QuerySelector
          bucketName="test-bucket"
          entryName="test-entry"
          defaultQuery='{"$each_t": "$__interval"}'
          onLoadQuery={onLoadQuery}
          editable={true}
        />,
      );
      await flush();
    });
    wrapper.update();

    expect(onLoadQuery).toHaveBeenCalledWith(
      expect.objectContaining({ name: "q1", query: '{"$each_t": "5s"}' }),
    );
    expect(
      useQueryStore.getState().getLoadedQueryName("test-bucket", "test-entry"),
    ).toBe("q1");
  });
});
