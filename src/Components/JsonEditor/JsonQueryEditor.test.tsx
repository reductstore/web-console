import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Client } from "reduct-js";
import { JsonQueryEditor } from "./JsonQueryEditor";
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
vi.mock("../../Helpers/json5Utils", () => ({
  processWhenCondition: () => ({ success: true, value: {} }),
}));

describe("JsonQueryEditor", () => {
  beforeEach(() => {
    mockJSDOM();
  });

  it("shows validation unavailable without validation context", () => {
    render(
      <JsonQueryEditor
        value="{}"
        onChange={() => {
          /* */
        }}
      />,
    );

    expect(screen.getByText("Validation unavailable")).toBeInTheDocument();
  });

  it("forwards changes from the editor", () => {
    const onChange = vi.fn();
    render(<JsonQueryEditor value="{}" onChange={onChange} />);

    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: '{"a":1}' },
    });

    expect(onChange).toHaveBeenCalledWith('{"a":1}');
  });

  it("disables format button when readOnly", () => {
    render(
      <JsonQueryEditor
        value="{}"
        onChange={() => {
          /* */
        }}
        readOnly
      />,
    );

    expect(screen.getByLabelText("Format JSON")).toBeDisabled();
  });

  it("prompts for bucket when validation context has no bucket", () => {
    const client = {} as Client;
    render(
      <JsonQueryEditor
        value="{}"
        onChange={() => {
          /* */
        }}
        validationContext={{ client, bucket: "" }}
      />,
    );

    expect(screen.getByText("Select bucket")).toBeInTheDocument();
  });

  it("shows the expanded placeholder after clicking expand", () => {
    render(
      <JsonQueryEditor
        value="{}"
        onChange={() => {
          /* */
        }}
      />,
    );

    fireEvent.click(screen.getByLabelText("Expand editor"));

    expect(
      screen.getByText("Editing in expanded JSON editor"),
    ).toBeInTheDocument();
  });

  it("passes start/stop into the validation query", async () => {
    const queryNext = vi.fn().mockResolvedValue({ done: true });
    const query = vi.fn().mockReturnValue({ next: queryNext });
    const client = {
      getBucket: vi.fn().mockResolvedValue({ query }),
    } as unknown as Client;

    render(
      <JsonQueryEditor
        value="{}"
        onChange={() => {
          /* */
        }}
        validationContext={{
          client,
          bucket: "bucket-a",
          entry: "entry-a",
          start: 1n,
          end: 2n,
        }}
      />,
    );

    const validateButton = screen.getByLabelText("Validate condition");
    await act(async () => {
      fireEvent.click(validateButton);
    });

    await waitFor(() =>
      expect(query).toHaveBeenCalledWith("entry-a", 1n, 2n, expect.anything()),
    );
  });
});
