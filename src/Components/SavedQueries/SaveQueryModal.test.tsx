import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import { message } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import SaveQueryModal from "./SaveQueryModal";
import { useQueryStore } from "../../stores/queryStore";

jest.setTimeout(15000);

const flush = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("SaveQueryModal", () => {
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    useQueryStore.getState().clearQueries();
    message.success = jest.fn() as unknown as typeof message.success;
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  const mountModal = async (open = true, queryText = '{"$each_t": "1s"}') => {
    await act(async () => {
      wrapper = mount(
        <SaveQueryModal
          open={open}
          onClose={jest.fn()}
          bucketName="test-bucket"
          entryName="test-entry"
          queryText={queryText}
          timeFormat="UTC"
          rangeKey="last7"
        />,
      );
      await flush();
    });
    wrapper.update();
  };

  it("renders modal with input when open", async () => {
    await mountModal();
    expect(wrapper.find('[data-testid="query-name-input"]').exists()).toBe(
      true,
    );
  });

  it("save button is disabled when name is empty", async () => {
    await mountModal();
    const saveBtn = wrapper
      .find("button")
      .filterWhere((btn) => btn.text() === "Save");
    expect(saveBtn.prop("disabled")).toBe(true);
  });

  it("saves query to store when name is provided", async () => {
    await mountModal();

    await act(async () => {
      wrapper
        .find('[data-testid="query-name-input"]')
        .find("input")
        .simulate("change", { target: { value: "my-query" } });
      await flush();
    });
    wrapper.update();

    await act(async () => {
      wrapper
        .find("button")
        .filterWhere((btn) => btn.text() === "Save")
        .simulate("click");
      await flush();
    });
    wrapper.update();

    const queries = useQueryStore
      .getState()
      .getQueries("test-bucket", "test-entry");
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({
      name: "my-query",
      query: '{"$each_t": "1s"}',
      timeFormat: "UTC",
      rangeKey: "last7",
    });
    expect(message.success).toHaveBeenCalledWith('Query "my-query" saved');
  });

  it("shows overwrite confirmation for existing query name", async () => {
    // Pre-load a query
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "existing",
      query: "{}",
    });
    useQueryStore
      .getState()
      .setLoadedQueryName("test-bucket", "test-entry", null);

    await mountModal();

    await act(async () => {
      wrapper
        .find('[data-testid="query-name-input"]')
        .find("input")
        .simulate("change", { target: { value: "existing" } });
      await flush();
    });
    wrapper.update();

    await act(async () => {
      wrapper
        .find("button")
        .filterWhere((btn) => btn.text() === "Save")
        .simulate("click");
      await flush();
    });
    wrapper.update();

    // Overwrite modal should appear
    expect(wrapper.text()).toContain("already exists");
  });
});
