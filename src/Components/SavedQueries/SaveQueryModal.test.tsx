import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { message } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import SaveQueryModal from "./SaveQueryModal";
import { useQueryStore } from "../../stores/queryStore";
import { BuilderState } from "../../Helpers/builderReducer";

vi.setConfig({ testTimeout: 15000 });

describe("SaveQueryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    useQueryStore.getState().clearQueries();
    message.success = vi.fn() as unknown as typeof message.success;
  });

  const renderModal = (
    open = true,
    queryText = '{"$each_t": "1s"}',
    mode: "builder" | "json" = "builder",
    builderState?: BuilderState,
  ) => {
    return render(
      <SaveQueryModal
        open={open}
        onClose={vi.fn()}
        bucketName="test-bucket"
        entryName="test-entry"
        queryText={queryText}
        mode={mode}
        timeFormat="UTC"
        rangeKey="last7"
        builderState={builderState}
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
        mode: "builder",
        timeFormat: "UTC",
        rangeKey: "last7",
      });
    });
    expect(message.success).toHaveBeenCalledWith('Query "my-query" saved');
  });

  it("saves the builder state snapshot alongside the query, so a disabled stage isn't lost on reload", async () => {
    const builderState: BuilderState = {
      conditionBlocks: [],
      steps: [{ id: "limit-1", type: "limit", limit: { count: 5 } }],
      extBlocks: [],
      blockOrder: ["limit-1"],
      enabled: { "limit-1": false },
      pendingStages: [],
    };
    renderModal(true, '{"$each_t": "1s"}', "builder", builderState);

    fireEvent.change(screen.getByTestId("query-name-input"), {
      target: { value: "my-query" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const queries = useQueryStore
        .getState()
        .getQueries("test-bucket", "test-entry");
      expect(queries[0].builderState).toEqual(builderState);
    });
  });

  it("saves the mode the query was in when the modal was opened", async () => {
    renderModal(true, '{"$each_t": "1s"}', "json");

    fireEvent.change(screen.getByTestId("query-name-input"), {
      target: { value: "my-json-query" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const queries = useQueryStore
        .getState()
        .getQueries("test-bucket", "test-entry");
      expect(queries[0]).toMatchObject({ mode: "json" });
    });
  });

  it("shows overwrite confirmation for existing query name", async () => {
    // Pre-load a query
    useQueryStore.getState().saveQuery("test-bucket", "test-entry", {
      name: "existing",
      query: "{}",
    });

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
