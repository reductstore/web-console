import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Client } from "reduct-js";
import type { DragEndEvent } from "@dnd-kit/core";
import QueryConditionBuilder from "./QueryConditionBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";

let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock("@dnd-kit/core", async () => {
  const actual =
    await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    // Renders the real DndContext (so nested SortableContext/useSortable
    // still work) but also captures onDragEnd so tests can invoke it
    // directly - simulating a real pointer drag isn't feasible in jsdom.
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      capturedOnDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock("monaco-editor", () => ({}));
vi.mock("@reductstore/reduct-query-monaco", () => ({
  getCompletionProvider: () => ({}),
}));

beforeEach(() => {
  mockJSDOM();
  capturedOnDragEnd = undefined;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const noop = () => {};

// Rows are hidden until a bucket and entry are selected, so most tests need
// this to exercise the builder at all.
const readyValidationContext = {
  client: {} as Client,
  bucket: "testBucket",
  entry: "testEntry",
};

// Label filter is a step like Sample/Limit - added on demand from the
// "+ Add step" menu rather than shown by default.
const addWhereLabels = async () => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Add step"));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Label filter"));
  });
};

describe("QueryConditionBuilder", () => {
  it("shows Query with no blocks for an empty value until one is added", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    expect(screen.getByText("Query")).toBeTruthy();
    expect(screen.queryByText("Label filter")).toBeNull();
    expect(screen.queryByPlaceholderText("value")).toBeNull();
  });

  it("reveals one empty condition row once Label filter is added from the menu", async () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    expect(screen.getByLabelText("Remove label filter")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toBeTruthy();
  });

  it("hides every block until a bucket and entry are selected, but keeps Add step reachable and greys out its menu", async () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getByText("Query")).toBeTruthy();
    expect(screen.queryByPlaceholderText("value")).toBeNull();
    expect(screen.getByLabelText("Add step")).not.toBeDisabled();
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Add step"));
    });
    expect(
      screen.getByRole("menuitem", { name: "Label filter" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("shows the JSON editor with the current value in json mode", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="json"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      '{"&status": {"$eq": "active"}}',
    );
    expect(screen.queryByText("Query")).toBeNull();
  });

  it("resyncs conditions when value changes from outside while already in builder mode", () => {
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");

    // Simulate a saved query being loaded while already in Builder mode
    // (the QuerySelector calls the parent's setter directly).
    rerender(
      <QueryConditionBuilder
        value={'{"&method": {"$eq": "GET"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );

    const labelInput = screen.getByRole("combobox", { name: "Label" });
    expect(labelInput).toHaveValue("method");
    expect(screen.getByPlaceholderText("value")).toHaveValue("GET");
  });

  it("calls onUnrepresentable when a value loaded in builder mode can't be flattened", () => {
    const onUnrepresentable = vi.fn();
    const { rerender } = render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={onUnrepresentable}
      />,
    );
    rerender(
      <QueryConditionBuilder
        value={
          '{"$and": [{"&a": {"$eq": "1"}}, {"$or": [{"&b": {"$eq": "2"}}, {"&c": {"$eq": "3"}}]}]}'
        }
        onChange={noop}
        mode="builder"
        onUnrepresentable={onUnrepresentable}
      />,
    );
    expect(onUnrepresentable).toHaveBeenCalled();
  });

  it("preserves $each_t across an edit instead of silently dropping it", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      "&status": { $eq: "active" },
      $each_t: "$__interval",
    });
  });

  it("parses an existing condition into the builder", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    expect(labelInput).toHaveValue("status");
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("reports the serialized JSON when a condition is edited", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    expect(onChange).toHaveBeenCalled();
    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({ "&status": { $eq: "active" } });
  });

  it("fetches label suggestions from a sample of records", async () => {
    const bucket = {
      query: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { labels: { status: "active" } };
          yield { labels: { method: "GET" } };
        },
      }),
    };
    const client = {
      getBucket: vi.fn().mockResolvedValue(bucket),
    } as unknown as Client;

    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );

    await waitFor(() =>
      expect(client.getBucket).toHaveBeenCalledWith("testBucket"),
    );
    expect(bucket.query).toHaveBeenCalledWith(
      "testEntry",
      undefined,
      undefined,
      expect.objectContaining({ head: true, when: { $limit: 20 } }),
    );

    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.mouseDown(labelInput);
    expect(await screen.findByTitle("status")).toBeTruthy();
    expect(screen.getByTitle("method")).toBeTruthy();
  });

  it("does not throw when the label suggestion query fails", async () => {
    const client = {
      getBucket: vi.fn().mockRejectedValue(new Error("bucket unreachable")),
    } as unknown as Client;

    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );

    await waitFor(() =>
      expect(client.getBucket).toHaveBeenCalledWith("testBucket"),
    );
    expect(screen.getByText("Query")).toBeTruthy();
  });

  it("adds a chained condition with a connector when + is clicked", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client: {} as Client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    // The "+" button stays disabled until the row it would chain off of has
    // both a label and a value.
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });

    fireEvent.click(screen.getByLabelText("Add condition"));
    // Comboboxes now: [0] row1 label, [1] row1 operator, [2] connector,
    // [3] row2 label, [4] row2 operator.
    const combos = screen.getAllByRole("combobox");
    fireEvent.change(combos[3], { target: { value: "method" } });
    const [, row2Value] = screen.getAllByPlaceholderText("value");
    fireEvent.change(row2Value, { target: { value: "GET" } });

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [{ "&status": { $eq: "active" } }, { "&method": { $eq: "GET" } }],
    });
  });

  it("negates a chained condition by picking not from the connector dropdown", async () => {
    // The first row never has a connector/NOT control, so negation is only
    // reachable once a 2nd row exists.
    const onChange = vi.fn();
    const { container } = render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client: {} as Client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );
    await addWhereLabels();
    // The "+" button stays disabled until row 1 has both a label and a
    // value.
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    fireEvent.click(screen.getByLabelText("Add condition"));

    // A blank row is omitted from the serialized query, so fill row 2 in
    // too before checking how it negates.
    // Comboboxes: [0] row1 label, [1] row1 operator, [2] connector,
    // [3] row2 label, [4] row2 operator.
    const combos = screen.getAllByRole("combobox");
    fireEvent.change(combos[3], { target: { value: "flag" } });
    const [, row2Value] = screen.getAllByPlaceholderText("value");
    fireEvent.change(row2Value, { target: { value: "true" } });

    // Non-autocomplete selects in DOM order: row1 operator, row2 connector,
    // row2 operator.
    const [, connectorSelect] = container.querySelectorAll(
      ".ant-select:not(.ant-select-auto-complete)",
    );
    fireEvent.mouseDown(connectorSelect as HTMLElement);
    fireEvent.click(screen.getByTitle("not"));

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [
        { "&status": { $eq: "active" } },
        { $not: { "&flag": { $eq: "true" } } },
      ],
    });
  });

  it("never shows a connector or NOT control on the first row", async () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    expect(screen.queryByText("and")).toBeNull();
    expect(screen.queryByText("not")).toBeNull();
  });

  it("shows the error message passed in while in builder mode", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        error="Fill in or remove the incomplete row before running the query."
        validationContext={readyValidationContext}
      />,
    );
    expect(
      screen.getByText(
        "Fill in or remove the incomplete row before running the query.",
      ),
    ).toBeTruthy();
  });

  it("reports an incomplete condition once only the label is filled in", async () => {
    const onIncompleteConditionChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
        onIncompleteConditionChange={onIncompleteConditionChange}
      />,
    );
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

    await addWhereLabels();
    // A freshly revealed blank row isn't incomplete either - only a
    // partially filled one is.
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
  });

  it("reports no incomplete condition while in json mode", () => {
    const onIncompleteConditionChange = vi.fn();
    render(
      <QueryConditionBuilder
        value={'{"&status'}
        onChange={noop}
        mode="json"
        onUnrepresentable={noop}
        onIncompleteConditionChange={onIncompleteConditionChange}
      />,
    );
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
  });

  describe("each_n/each_t/Limit steps", () => {
    const openAddStepMenu = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add step"));
      });
    };

    it("adds a Sample step (each_t by default) and combines it with an existing filter", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Label filter" }));
      });
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample by time" }),
        );
      });
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $each_t: "30s",
      });
    });

    it("adds a Sample every N step directly and reports its count", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample every N" }),
        );
      });
      fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
        target: { value: "20" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({ $each_n: 20 });
    });

    it("adds each_t and each_n as two separate steps, matching the mandant's each_n+each_t example", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample by time" }),
        );
      });
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "1s" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample every N" }),
        );
      });
      fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
        target: { value: "20" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        $each_t: "1s",
        $each_n: 20,
      });
    });

    it("greys out both Sample kinds in the menu once each_n and each_t are both present", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample by time" }),
        );
      });
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample every N" }),
        );
      });

      await openAddStepMenu();
      expect(
        screen.getByRole("menuitem", { name: "Sample by time" }),
      ).toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("menuitem", { name: "Sample every N" }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("adds a limit step and combines it with an existing filter", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Label filter" }));
      });
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Limit" }));
      });
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "100" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $limit: 100,
      });
    });

    it("adds both a Sample step and a limit step together", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Label filter" }));
      });
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample by time" }),
        );
      });
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Limit" }));
      });
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $each_t: "30s",
        $limit: 50,
      });
    });

    it("reorders the JSON's keys to match a drag-and-drop reorder of the blocks", async () => {
      // Spying (not mocking the implementation) still returns the real
      // generated ids, just lets the test read back which one a specific
      // action produced.
      const uuidMock = vi.spyOn(crypto, "randomUUID");
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Label filter" }));
      });
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      const callsBeforeLimit = uuidMock.mock.results.length;
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Limit" }));
      });
      const limitStepId = uuidMock.mock.results[callsBeforeLimit]
        .value as string;
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });

      const [beforeDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(beforeDrag))).toEqual([
        "&status",
        "$limit",
      ]);

      // Drag the Limit block above the Label filter block.
      act(() => {
        capturedOnDragEnd?.({
          active: { id: limitStepId },
          over: { id: "conditions" },
        } as DragEndEvent);
      });

      const [afterDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(afterDrag))).toEqual(["$limit", "&status"]);

      uuidMock.mockRestore();
    });

    it("reorders the JSON's ext key to match a drag-and-drop reorder involving the Transform block", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Label filter" }));
      });
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Process (ROS)" }),
        );
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Filter"));
      });
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/robot/odom" } },
      );

      const [beforeDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(beforeDrag))).toEqual(["&status", "#ext"]);

      // Drag the Transform block above the Label filter block.
      act(() => {
        capturedOnDragEnd?.({
          active: { id: "transform" },
          over: { id: "conditions" },
        } as DragEndEvent);
      });

      const [afterDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(afterDrag))).toEqual(["#ext", "&status"]);
    });

    it("reports an incomplete step once its default count is cleared, and clears once refilled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Limit" }));
      });
      // Limit defaults to a count of 1000, so adding it alone doesn't block
      // Run Query.
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("reports an incomplete Sample step once its macro-based default is cleared, and clears once refilled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={{
            ...readyValidationContext,
            intervalValue: "30s",
          }}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Sample by time" }),
        );
      });
      // Sample defaults to the interval macro, so adding it alone doesn't
      // block Run Query.
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("greys out the matching menu item once limit is already added", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByRole("menuitem", { name: "Limit" }));
      });
      await openAddStepMenu();
      expect(screen.getByRole("menuitem", { name: "Limit" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(
        screen.getByRole("menuitem", { name: "Sample by time" }),
      ).toBeTruthy();
      expect(
        screen.getByRole("menuitem", { name: "Sample every N" }),
      ).toBeTruthy();
    });

    describe("default Sample step", () => {
      it("shows the default $each_t/$__interval step automatically, without needing to be added", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.getByText("Sample by time")).toBeTruthy();
        expect(screen.getByLabelText("Remove sample step")).toBeTruthy();
      });

      it("preserves the default Sample step when a condition is edited", async () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        await openAddStepMenu();
        await act(async () => {
          fireEvent.click(
            screen.getByRole("menuitem", { name: "Label filter" }),
          );
        });
        const labelInput = screen.getByRole("combobox", { name: "Label" });
        fireEvent.change(labelInput, { target: { value: "status" } });
        fireEvent.change(screen.getByPlaceholderText("value"), {
          target: { value: "active" },
        });

        const [lastCall] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(lastCall)).toEqual({
          "&status": { $eq: "active" },
          $each_t: "$__interval",
        });
      });

      it("keeps using the interval macro on the default Sample step, letting a typed duration override it", () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
          target: { value: "30s" },
        });
        const [afterDuration] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(afterDuration)).toEqual({ $each_t: "30s" });
      });

      it("fully removes sampling once the default step is removed via its X", () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );

        fireEvent.click(screen.getByLabelText("Remove sample step"));

        expect(screen.queryByLabelText("Remove sample step")).toBeNull();
        const [lastCall] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(lastCall)).toEqual({});
      });

      it("does not report incomplete when typing a malformed duration - format errors are the API's to report", () => {
        const onIncompleteConditionChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
            onIncompleteConditionChange={onIncompleteConditionChange}
          />,
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
          target: { value: "30 s" },
        });

        expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
      });

      it("shows a non-default Sample step immediately, without needing to be added", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "30s"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.getByText("Sample by time")).toBeTruthy();
        expect(screen.getByRole("combobox", { name: "Interval" })).toHaveValue(
          "30s",
        );
      });
    });
  });

  describe("Process (ROS) step", () => {
    const openAddStepMenu = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add step"));
      });
    };

    const addTransformBlock = async () => {
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(
          screen.getByRole("menuitem", { name: "Process (ROS)" }),
        );
      });
    };

    const addSection = async (
      name: "Filter" | "Encode" | "As label" | "Export",
    ) => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText(name));
      });
    };

    it("adds a fresh transform (no sections yet) via the menu", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      expect(screen.getByLabelText("Add option")).toBeTruthy();
      expect(
        screen.queryByPlaceholderText("optional ROS topic filter"),
      ).toBeNull();
    });

    it("removes the transform via its card's remove button", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      fireEvent.click(screen.getByLabelText("Remove process"));
      expect(screen.queryByLabelText("Add option")).toBeNull();
    });

    it("offers Process (ROS) again in the Add step menu after it's removed, and drops #ext from onChange", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      fireEvent.click(screen.getByLabelText("Remove process"));

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).not.toHaveProperty("#ext");

      await openAddStepMenu();
      expect(
        screen.getByRole("menuitem", { name: "Process (ROS)" }),
      ).toBeTruthy();
    });

    it("reports a typed topic and as_label mapping through onChange, merged as a #ext key", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addSection("Filter");
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/robot/odom" } },
      );
      await addSection("As label");
      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "speed" },
      });
      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "data.speed" },
      });

      const lastValue = onChange.mock.calls.at(-1)?.[0] as string;
      const parsed = JSON.parse(lastValue);
      expect(parsed["#ext"].ros.extract).toMatchObject({
        topic: "/robot/odom",
        as_label: { speed: "data.speed" },
      });
    });

    it("reports an incomplete transform for a half-filled encode row, and clears once both sides are filled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );
      await addTransformBlock();
      await addSection("Encode");

      fireEvent.change(screen.getByPlaceholderText("field (e.g. data)"), {
        target: { value: "data" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("encoding (e.g. jpeg)"), {
        target: { value: "jpeg" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("shows a transform carried in the value prop's #ext key, without needing to be added", () => {
      const value = JSON.stringify({
        "#ext": {
          ros: {
            extract: {
              topic: "/robot/odom",
              as_label: { speed: "data.speed" },
            },
          },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("Process (ROS)")).toBeTruthy();
      expect(
        screen.getByPlaceholderText("optional ROS topic filter"),
      ).toHaveValue("/robot/odom");
    });

    it("resyncs when the value prop's #ext key changes from outside while already in builder mode", () => {
      const { rerender } = render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.queryByText("Process (ROS)")).toBeNull();

      const value = JSON.stringify({
        "#ext": {
          ros: {
            extract: {
              topic: "/robot/odom",
              as_label: { speed: "data.speed" },
            },
          },
        },
      });
      rerender(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("Process (ROS)")).toBeTruthy();
    });
  });
});
