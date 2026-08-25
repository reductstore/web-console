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

describe("QueryConditionBuilder", () => {
  it("starts in Builder mode with one empty condition for an empty value", () => {
    render(<QueryConditionBuilder value="" onChange={() => {}} />);
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toBeTruthy();
  });

  it("starts in JSON mode when the initial value isn't representable", () => {
    render(
      <QueryConditionBuilder
        value={
          '{"$and": [{"&a": {"$eq": "1"}}, {"$or": [{"&b": {"$eq": "2"}}, {"&c": {"$eq": "3"}}]}]}'
        }
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.getByTestId("monaco-editor")).toBeTruthy();
  });

  it("parses an existing condition into the builder", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={() => {}}
      />,
    );
    const [labelInput] = screen.getAllByRole("combobox");
    expect(labelInput).toHaveValue("status");
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("reports the serialized JSON when a condition is edited", () => {
    const onChange = vi.fn();
    render(<QueryConditionBuilder value="" onChange={onChange} />);
    const [labelInput] = screen.getAllByRole("combobox");
    fireEvent.change(labelInput, { target: { value: "status" } });
    expect(onChange).toHaveBeenCalled();
    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({ "&status": { $eq: "" } });
  });

  it("switches to the JSON editor and shows the current value", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      '{"&status": {"$eq": "active"}}',
    );
    expect(screen.queryByText("Where labels")).toBeNull();
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
        onChange={() => {}}
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
        onChange={() => {}}
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

  it("reparses losslessly when returning to Builder without touching the JSON", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("asks for confirmation and resets the builder once confirmed", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: '{"&status": {"$eq": "inactive"}}' },
    });
    expect(onChange).toHaveBeenCalledWith('{"&status": {"$eq": "inactive"}}');
    // A real parent (like QueryPanel) re-renders with the updated value once
    // its own onChange handler runs.
    rerender(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "inactive"}}'}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    // Still in JSON mode: the switch is deferred behind the confirmation.
    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.getByText(/completely reset the builder/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    // Now in Builder mode, wiped rather than partially reparsed.
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toHaveValue("");
  });

  it("stays in JSON mode and keeps the edit when the reset is cancelled", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: '{"&status": {"$eq": "inactive"}}' },
    });
    rerender(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "inactive"}}'}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Where labels")).toBeNull();
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      '{"&status": {"$eq": "inactive"}}',
    );
  });

  it("resets the builder when the JSON changes from outside while in JSON mode", () => {
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));

    // Simulate a saved query being loaded while in JSON mode: the parent
    // forwards a new `value` without going through this component's onChange.
    rerender(
      <QueryConditionBuilder
        value={'{"&method": {"$eq": "GET"}}'}
        onChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toHaveValue("");
  });

  it("adds a chained condition with a connector when + is clicked", () => {
    const onChange = vi.fn();
    render(<QueryConditionBuilder value="" onChange={onChange} />);
    const [labelInput] = screen.getAllByRole("combobox");
    fireEvent.change(labelInput, { target: { value: "status" } });

    fireEvent.click(screen.getByLabelText("Add condition"));
    // Comboboxes now: [0] row1 label, [1] row1 operator, [2] connector,
    // [3] row2 label, [4] row2 operator.
    const combos = screen.getAllByRole("combobox");
    fireEvent.change(combos[3], { target: { value: "method" } });

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [{ "&status": { $eq: "" } }, { "&method": { $eq: "" } }],
    });
  });

  it("negates a chained condition by picking not from the connector dropdown", () => {
    // The first row never has a connector/NOT control, so negation is only
    // reachable once a 2nd row exists.
    const onChange = vi.fn();
    const { container } = render(
      <QueryConditionBuilder value="" onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText("Add condition"));

    // Non-autocomplete selects in DOM order: row1 operator, row2 connector,
    // row2 operator.
    const [, connectorSelect] = container.querySelectorAll(
      ".ant-select:not(.ant-select-auto-complete)",
    );
    fireEvent.mouseDown(connectorSelect as HTMLElement);
    fireEvent.click(screen.getByTitle("not"));

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [{ "&": { $eq: "" } }, { $not: { "&": { $eq: "" } } }],
    });
  });

  it("never shows a connector or NOT control on the first row", () => {
    render(<QueryConditionBuilder value="" onChange={() => {}} />);
    expect(screen.queryByText("and")).toBeNull();
    expect(screen.queryByText("not")).toBeNull();
  });

  it("shows the Save button and toolbar extras in Builder mode", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={() => {}}
        onSave={() => {}}
        toolbarExtra={<button>Load query</button>}
      />,
    );
    expect(screen.getByLabelText("Save query")).toBeTruthy();
    expect(screen.getByText("Load query")).toBeTruthy();
  });
});
