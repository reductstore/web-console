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

  it("resizes with the keyboard and clamps to its bounds", () => {
    render(<JsonQueryEditor value="{}" onChange={() => {}} height={140} />);
    const handle = screen.getByRole("separator", {
      name: "Resize JSON editor",
    });
    const container = handle.parentElement!;

    expect(container).toHaveStyle({ height: "140px" });
    expect(handle).toHaveAttribute("aria-valuenow", "140");

    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(container).toHaveStyle({ height: "156px" });

    for (let i = 0; i < 10; i += 1) {
      fireEvent.keyDown(handle, { key: "ArrowUp" });
    }
    expect(container).toHaveStyle({ height: "100px" });
    expect(handle).toHaveAttribute("aria-valuenow", "100");

    for (let i = 0; i < 100; i += 1) {
      fireEvent.keyDown(handle, { key: "ArrowDown" });
    }
    const maximum = handle.getAttribute("aria-valuemax");
    expect(container).toHaveStyle({ height: `${maximum}px` });
    expect(handle).toHaveAttribute("aria-valuenow", maximum);
  });

  it("resizes by pointer drag and removes listeners on completion", () => {
    render(<JsonQueryEditor value="{}" onChange={() => {}} height={140} />);
    const handle = screen.getByRole("separator", {
      name: "Resize JSON editor",
    });
    const container = handle.parentElement!;
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 0,
      bottom: 140,
      left: 0,
      width: 0,
      height: 140,
      toJSON: () => ({}),
    });
    const removeListener = vi.spyOn(window, "removeEventListener");

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientY: 100,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientY: 180 });
    expect(container).toHaveStyle({ height: "220px" });

    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(removeListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );
  });

  it("keeps following height props until a manual resize", () => {
    const { rerender } = render(
      <JsonQueryEditor value="{}" onChange={() => {}} height={120} />,
    );
    const handle = screen.getByRole("separator", {
      name: "Resize JSON editor",
    });

    rerender(<JsonQueryEditor value="{}" onChange={() => {}} height={180} />);
    expect(handle.parentElement).toHaveStyle({ height: "180px" });

    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle.parentElement).toHaveStyle({ height: "196px" });

    rerender(
      <JsonQueryEditor
        value={'{\n  "changed": true\n}'}
        onChange={() => {}}
        height={300}
      />,
    );
    expect(handle.parentElement).toHaveStyle({ height: "196px" });
  });

  it("keeps the expanded editor full-height without a resize handle", () => {
    render(<JsonQueryEditor value="{}" onChange={() => {}} height={120} />);
    const handle = screen.getByRole("separator", {
      name: "Resize JSON editor",
    });
    fireEvent.keyDown(handle, { key: "ArrowDown" });

    fireEvent.click(screen.getByLabelText("Expand editor"));

    expect(
      screen.queryByRole("separator", { name: "Resize JSON editor" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(
        ".jsonQueryEditorModalContent .jsonQueryEditorContainer",
      ),
    ).toHaveStyle({ height: "100%" });

    fireEvent.click(screen.getByLabelText("Collapse editor"));
    expect(
      screen.getByRole("separator", { name: "Resize JSON editor" })
        .parentElement,
    ).toHaveStyle({ height: "136px" });
  });

  it("starts from the supplied height after remounting", () => {
    const first = render(
      <JsonQueryEditor value="{}" onChange={() => {}} height={120} />,
    );
    fireEvent.keyDown(
      screen.getByRole("separator", { name: "Resize JSON editor" }),
      { key: "ArrowDown" },
    );
    first.unmount();

    render(<JsonQueryEditor value="{}" onChange={() => {}} height={220} />);

    expect(
      screen.getByRole("separator", { name: "Resize JSON editor" })
        .parentElement,
    ).toHaveStyle({ height: "220px" });
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
