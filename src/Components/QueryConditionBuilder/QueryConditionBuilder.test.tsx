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

  it("blocks switching back to Builder when the JSON is not representable", () => {
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.queryByText("Where labels")).toBeNull();

    // Simulate the parent forwarding a manually-typed, non-representable
    // value (a numeric comparison) back down as the new `value` prop.
    rerender(
      <QueryConditionBuilder
        value={'{"&count": {"$gt": 10}}'}
        onChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    // Still in JSON mode: the transition to Builder was refused.
    expect(screen.queryByText("Where labels")).toBeNull();
  });
});
