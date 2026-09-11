import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Client } from "reduct-js";
import { QueryEditor } from "./QueryEditor";
import { mockJSDOM } from "../../Helpers/TestHelpers";

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    beforeMount,
    onMount,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    beforeMount?: (monaco: unknown) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) => {
    const stubMonaco = {
      languages: { registerCompletionItemProvider: vi.fn() },
    };
    beforeMount?.(stubMonaco);
    onMount?.(
      {
        trigger: vi.fn(),
        onDidFocusEditorText: vi.fn(),
        onMouseDown: vi.fn(),
        getModel: () => null,
        getAction: () => null,
      },
      stubMonaco,
    );
    return (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  },
}));

vi.mock("monaco-editor", () => ({}));
const getSqlCompletionProvider = vi.fn(() => ({}));
vi.mock("@reductstore/reduct-query-monaco", () => ({
  getCompletionProvider: () => ({}),
  getSqlCompletionProvider: () => getSqlCompletionProvider(),
}));
vi.mock("../../Helpers/json5Utils", () => ({
  processWhenCondition: () => ({ success: true, value: {} }),
}));

describe("QueryEditor", () => {
  beforeEach(() => {
    mockJSDOM();
  });

  it("shows validation unavailable without validation context", () => {
    render(
      <QueryEditor
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
    render(<QueryEditor value="{}" onChange={onChange} />);

    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: '{"a":1}' },
    });

    expect(onChange).toHaveBeenCalledWith('{"a":1}');
  });

  it("disables format button when readOnly", () => {
    render(
      <QueryEditor
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
      <QueryEditor
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
      <QueryEditor
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
    render(<QueryEditor value="{}" onChange={() => {}} height={140} />);
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
    render(<QueryEditor value="{}" onChange={() => {}} height={140} />);
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
      <QueryEditor value="{}" onChange={() => {}} height={120} />,
    );
    const handle = screen.getByRole("separator", {
      name: "Resize JSON editor",
    });

    rerender(<QueryEditor value="{}" onChange={() => {}} height={180} />);
    expect(handle.parentElement).toHaveStyle({ height: "180px" });

    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle.parentElement).toHaveStyle({ height: "196px" });

    rerender(
      <QueryEditor
        value={'{\n  "changed": true\n}'}
        onChange={() => {}}
        height={300}
      />,
    );
    expect(handle.parentElement).toHaveStyle({ height: "196px" });
  });

  it("keeps the expanded editor full-height without a resize handle", () => {
    render(<QueryEditor value="{}" onChange={() => {}} height={120} />);
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
      <QueryEditor value="{}" onChange={() => {}} height={120} />,
    );
    fireEvent.keyDown(
      screen.getByRole("separator", { name: "Resize JSON editor" }),
      { key: "ArrowDown" },
    );
    first.unmount();

    render(<QueryEditor value="{}" onChange={() => {}} height={220} />);

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
      <QueryEditor
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

  describe("sql language", () => {
    it("shows the current SQL value", () => {
      render(
        <QueryEditor
          language="sql"
          value="SELECT * FROM ENTRY()"
          onChange={() => {}}
        />,
      );
      expect(screen.getByTestId("monaco-editor")).toHaveValue(
        "SELECT * FROM ENTRY()",
      );
    });

    it("reports a typed SQL value", () => {
      const onChange = vi.fn();
      render(<QueryEditor language="sql" value="" onChange={onChange} />);
      fireEvent.change(screen.getByTestId("monaco-editor"), {
        target: { value: "SELECT temp.value FROM ENTRY()" },
      });
      expect(onChange).toHaveBeenCalledWith("SELECT temp.value FROM ENTRY()");
    });

    it("registers the SQL completion provider", () => {
      render(<QueryEditor language="sql" value="" onChange={() => {}} />);
      expect(getSqlCompletionProvider).toHaveBeenCalled();
    });

    it("hides the validate button and status for sql, keeping format and expand", () => {
      render(<QueryEditor language="sql" value="" onChange={() => {}} />);
      expect(
        screen.queryByLabelText("Validate condition"),
      ).not.toBeInTheDocument();
      expect(screen.getByLabelText("Format SQL")).toBeInTheDocument();
      expect(screen.getByLabelText("Expand editor")).toBeInTheDocument();
    });

    it("hides the expand button when allowExpand is false", () => {
      render(
        <QueryEditor
          language="sql"
          value=""
          onChange={() => {}}
          allowExpand={false}
        />,
      );
      expect(screen.queryByLabelText("Expand editor")).not.toBeInTheDocument();
    });
  });
});
