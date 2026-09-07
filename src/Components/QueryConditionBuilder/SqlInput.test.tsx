import { fireEvent, render, screen } from "@testing-library/react";
import SqlInput from "./SqlInput";

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
    beforeMount,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    beforeMount?: (monaco: unknown) => void;
  }) => {
    beforeMount?.({
      languages: { registerCompletionItemProvider: vi.fn() },
    });
    return (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  },
}));

const getSqlCompletionProvider = vi.fn(() => ({}));
vi.mock("@reductstore/reduct-query-monaco", () => ({
  getSqlCompletionProvider: () => getSqlCompletionProvider(),
}));

describe("SqlInput", () => {
  it("shows the current value", () => {
    render(<SqlInput value="SELECT * FROM ENTRY()" onChange={vi.fn()} />);
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      "SELECT * FROM ENTRY()",
    );
  });

  it("reports a typed value", () => {
    const onChange = vi.fn();
    render(<SqlInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: "SELECT temp.value FROM ENTRY()" },
    });
    expect(onChange).toHaveBeenCalledWith("SELECT temp.value FROM ENTRY()");
  });

  it("registers the SQL completion provider on mount", () => {
    render(<SqlInput value="" onChange={vi.fn()} />);
    expect(getSqlCompletionProvider).toHaveBeenCalled();
  });
});
