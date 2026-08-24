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

  it("resets the builder when the JSON was edited in JSON mode", () => {
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
    // Back in Builder mode (never blocked), but the edit wiped the condition
    // rather than being partially reparsed into it.
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toHaveValue("");
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
    expect(screen.getByText("Where labels")).toBeTruthy();
    expect(screen.getByPlaceholderText("value")).toHaveValue("");
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
