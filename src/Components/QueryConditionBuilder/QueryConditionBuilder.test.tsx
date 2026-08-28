import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Client } from "reduct-js";
import QueryConditionBuilder from "./QueryConditionBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";

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

// Where labels is now a step like Sample/Limit - added on demand from the
// "+ Add step" menu rather than shown by default.
const addWhereLabels = async () => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Add step"));
  });
  await act(async () => {
    fireEvent.click(screen.getByText("Where labels"));
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
    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.queryByPlaceholderText("value")).toBeNull();
  });

  it("reveals one empty condition row once Where labels is added from the menu", async () => {
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
    expect(screen.getByLabelText("Remove where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toBeTruthy();
  });

  it("hides every block and disables Add step until a bucket and entry are selected", () => {
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
    expect(screen.getByLabelText("Add step")).toBeDisabled();
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

    const [labelInput] = screen.getAllByRole("combobox");
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
    // This query has no conditions of its own yet - Where labels must be
    // added before there's a row to edit.
    await addWhereLabels();
    const [labelInput] = screen.getAllByRole("combobox");
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
    const [labelInput] = screen.getAllByRole("combobox");
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
    const [labelInput] = screen.getAllByRole("combobox");
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
    const [labelInput] = screen.getAllByRole("combobox");
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
    const [labelInput] = screen.getAllByRole("combobox");
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
    const [labelInput] = screen.getAllByRole("combobox");
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

    const [labelInput] = screen.getAllByRole("combobox");
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

  describe("Sample and Limit steps", () => {
    const openAddStepMenu = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add step"));
      });
    };

    it("adds a sample step and combines it with an existing filter", async () => {
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
        fireEvent.click(screen.getByText("Where labels"));
      });
      const [labelInput] = screen.getAllByRole("combobox");
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByText("Sample"));
      });
      fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
        target: { value: "30s" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $each_t: "30s",
      });
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
        fireEvent.click(screen.getByText("Where labels"));
      });
      const [labelInput] = screen.getAllByRole("combobox");
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByText("Limit"));
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

    it("adds both a sample step and a limit step together", async () => {
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
        fireEvent.click(screen.getByText("Where labels"));
      });
      const [labelInput] = screen.getAllByRole("combobox");
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByText("Sample"));
      });
      fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
        target: { value: "30s" },
      });
      await openAddStepMenu();
      await act(async () => {
        fireEvent.click(screen.getByText("Limit"));
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

    it("reports an incomplete step and clears once it's filled in", async () => {
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
        fireEvent.click(screen.getByText("Limit"));
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "100" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("reports an incomplete sample step and clears once a value is chosen", async () => {
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
        fireEvent.click(screen.getByText("Sample"));
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
        target: { value: "30s" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("removes the matching menu item once a step is already added", async () => {
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
        fireEvent.click(screen.getByText("Sample"));
      });
      await openAddStepMenu();
      expect(screen.queryByRole("menuitem", { name: "Sample" })).toBeNull();
      expect(screen.getByRole("menuitem", { name: "Limit" })).toBeTruthy();
    });

    describe("implicit default sample step", () => {
      it("hides the default $each_t/$__interval sample step", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.queryByText("Sample")).toBeNull();
        expect(screen.getByLabelText("Add step")).not.toBeDisabled();
      });

      it("preserves the hidden default sample step when a condition is edited", async () => {
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
        // This query has no conditions of its own yet - Where labels must
        // be added before there's a row to edit.
        await openAddStepMenu();
        await act(async () => {
          fireEvent.click(screen.getByText("Where labels"));
        });
        const [labelInput] = screen.getAllByRole("combobox");
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

      it("requires an explicit choice when revealing the default sample step, showing it blank in the meantime", async () => {
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
          fireEvent.click(screen.getByText("Sample"));
        });

        expect(screen.getByLabelText("Remove sample step")).toBeTruthy();
        const [afterReveal] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(afterReveal)).toEqual({ $each_t: "" });

        fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
          target: { value: "30s" },
        });
        const [afterDuration] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(afterDuration)).toEqual({ $each_t: "30s" });
      });

      it("fully removes sampling once the revealed default step is removed", async () => {
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
          fireEvent.click(screen.getByText("Sample"));
        });
        fireEvent.change(screen.getByPlaceholderText("duration (e.g. 30s)"), {
          target: { value: "30s" },
        });
        fireEvent.click(screen.getByLabelText("Remove sample step"));

        expect(screen.queryByLabelText("Remove sample step")).toBeNull();
        const [lastCall] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(lastCall)).toEqual({});
      });

      it("shows a non-default sample step immediately, without needing to be added", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "30s"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.getByText("Sample")).toBeTruthy();
        expect(screen.getByPlaceholderText("duration (e.g. 30s)")).toHaveValue(
          "30s",
        );
      });
    });
  });
});
