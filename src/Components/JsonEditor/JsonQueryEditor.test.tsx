import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Client } from "reduct-js";
import { JsonQueryEditor } from "./JsonQueryEditor";
import { mockJSDOM } from "../../Helpers/TestHelpers";

jest.mock("@monaco-editor/react", () => ({
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

jest.mock("monaco-editor", () => ({}));
jest.mock("@reductstore/reduct-query-monaco", () => ({
  getCompletionProvider: () => ({}),
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
    const onChange = jest.fn();
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

    expect(
      screen.getByText("Select bucket to validate condition"),
    ).toBeInTheDocument();
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
});
