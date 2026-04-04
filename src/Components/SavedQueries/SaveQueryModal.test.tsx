import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { message } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import SaveQueryModal from "./SaveQueryModal";
import { useQueryStore } from "../../stores/queryStore";

vi.setConfig({ testTimeout: 15000 });

describe("SaveQueryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    useQueryStore.getState().clearQueries();
    message.success = vi.fn() as unknown as typeof message.success;
  });

  const renderModal = (open = true, queryText = '{"$each_t": "1s"}') => {
    return render(
      <SaveQueryModal
        open={open}
        onClose={vi.fn()}
        bucketName="test-bucket"
        entryName="test-entry"
        queryText={queryText}
        timeFormat="UTC"
        rangeKey="last7"
      />,
    );
  };

  it("renders modal with input when open", () => {
    renderModal();
    expect(screen.getByTestId("query-name-input")).toBeInTheDocument();
  });

  it("save button is disabled when name is empty", () => {
    renderModal();
    const saveBtn = screen.getByRole("button", { name: "Save" });
    expect(saveBtn).toBeDisabled();
  });

  it("saves query to store when name is provided", async () => {
    renderModal();

    fireEvent.change(screen.getByTestId("query-name-input"), {
      target: { value: "my-query" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
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

    renderModal();

    fireEvent.change(screen.getByTestId("query-name-input"), {
      target: { value: "existing" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/)).toBeInTheDocument();
    });
  });
});
