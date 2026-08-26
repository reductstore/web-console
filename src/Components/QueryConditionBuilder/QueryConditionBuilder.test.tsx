import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

beforeEach(() => mockJSDOM());

const noop = () => {};

describe("QueryConditionBuilder", () => {
  it("shows Where labels with one empty condition for an empty value in builder mode", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toBeTruthy();
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
    expect(screen.queryByText("Where labels")).toBeNull();
  });

  it("resyncs conditions when value changes from outside while already in builder mode", () => {
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
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

  it("preserves $each_t across an edit instead of silently dropping it", () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
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
      />,
    );
    const [labelInput] = screen.getAllByRole("combobox");
    expect(labelInput).toHaveValue("status");
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("reports the serialized JSON when a condition is edited", () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
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
    expect(screen.getByText("Where labels")).toBeTruthy();
  });

  it("adds a chained condition with a connector when + is clicked", () => {
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

  it("negates a chained condition by picking not from the connector dropdown", () => {
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

  it("never shows a connector or NOT control on the first row", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.queryByText("and")).toBeNull();
    expect(screen.queryByText("not")).toBeNull();
  });
});
