import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SelectStageEditor from "./SelectStageEditor";
import {
  SelectTransformStep,
  SqlStep,
} from "../../Helpers/transformStepBuilder";

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
vi.mock("@reductstore/reduct-query-monaco", () => ({
  getSqlCompletionProvider: () => ({}),
}));

function makeSqlStep(overrides: Partial<SqlStep> & { id: string }): SqlStep {
  return {
    sql: "",
    asLabel: [],
    formatSections: [],
    csv: { hasHeaders: false },
    protobuf: { messageName: "", schema: "", fields: [] },
    export: { format: "", rows: "", duration: "" },
    ...overrides,
  };
}

const baseStep: SelectTransformStep = {
  sqlSteps: [makeSqlStep({ id: "sql-1" })],
};

describe("SelectStageEditor", () => {
  it("shows the current SQL value as a frozen preview, not an editable input", () => {
    render(
      <SelectStageEditor
        step={{
          sqlSteps: [
            makeSqlStep({ id: "sql-1", sql: "SELECT * FROM ENTRY()" }),
          ],
        }}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByText("SELECT * FROM ENTRY()")).toBeTruthy();
    expect(screen.queryByTestId("monaco-editor")).toBeNull();
  });

  it("shows SELECT * FROM ENTRY() as the default when the first SQL row is blank", () => {
    render(<SelectStageEditor step={baseStep} dispatch={vi.fn()} />);
    expect(screen.getByText("SELECT * FROM ENTRY()")).toBeTruthy();
    expect(screen.queryByText("No SQL yet")).toBeNull();
  });

  it("shows a placeholder when a later SQL row is blank", () => {
    const step: SelectTransformStep = {
      sqlSteps: [
        makeSqlStep({ id: "sql-1", sql: "SELECT * FROM ENTRY()" }),
        makeSqlStep({ id: "sql-2", sql: "" }),
      ],
    };
    render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
    expect(screen.getByText("No SQL yet")).toBeTruthy();
  });

  it("opens the SQL Editor modal via the edit button and reports a typed expression", () => {
    const dispatch = vi.fn();
    render(<SelectStageEditor step={baseStep} dispatch={dispatch} />);
    expect(screen.queryByTestId("monaco-editor")).toBeNull();

    fireEvent.click(screen.getByLabelText("Edit SQL"));
    expect(screen.getByText("SQL Editor")).toBeTruthy();

    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: "SELECT temp.value FROM ENTRY()" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "select/changeSql",
      id: "sql-1",
      sql: "SELECT temp.value FROM ENTRY()",
    });
  });

  it("hides the As label section when there are no rows", () => {
    render(<SelectStageEditor step={baseStep} dispatch={vi.fn()} />);
    expect(screen.queryByText("As label")).toBeNull();
  });

  it("dispatches transform/addAsLabelRow with kind select when As label is picked from the add menu", () => {
    const dispatch = vi.fn();
    render(<SelectStageEditor step={baseStep} dispatch={dispatch} />);
    fireEvent.click(screen.getByLabelText("Add option for SQL"));
    fireEvent.click(screen.getByText("As label"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "transform/addAsLabelRow",
      kind: "select",
      stepId: "sql-1",
      id: expect.any(String),
    });
  });

  it("shows As label rows and reports a changed field", () => {
    const dispatch = vi.fn();
    const step: SelectTransformStep = {
      sqlSteps: [
        makeSqlStep({
          id: "sql-1",
          asLabel: [{ id: "l1", key: "", value: "" }],
        }),
      ],
    };
    render(<SelectStageEditor step={step} dispatch={dispatch} />);
    expect(screen.getByText("As label")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
      target: { value: "speed" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "transform/changeAsLabelRow",
      kind: "select",
      stepId: "sql-1",
      id: "l1",
      changes: { key: "speed" },
    });
  });

  it("removes a row directly when other rows remain", () => {
    const dispatch = vi.fn();
    const step: SelectTransformStep = {
      sqlSteps: [
        makeSqlStep({
          id: "sql-1",
          asLabel: [
            { id: "l1", key: "speed", value: "vector.x" },
            { id: "l2", key: "heading", value: "vector.y" },
          ],
        }),
      ],
    };
    render(<SelectStageEditor step={step} dispatch={dispatch} />);
    fireEvent.click(screen.getAllByLabelText("Remove label mapping")[0]);
    expect(dispatch).toHaveBeenCalledWith({
      type: "transform/removeAsLabelRow",
      kind: "select",
      stepId: "sql-1",
      id: "l1",
    });
  });

  it("removes the only row through the same handler", () => {
    const dispatch = vi.fn();
    const step: SelectTransformStep = {
      sqlSteps: [
        makeSqlStep({
          id: "sql-1",
          asLabel: [{ id: "l1", key: "speed", value: "vector.x" }],
        }),
      ],
    };
    render(<SelectStageEditor step={step} dispatch={dispatch} />);
    fireEvent.click(screen.getByLabelText("Remove label mapping"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "transform/removeAsLabelRow",
      kind: "select",
      stepId: "sql-1",
      id: "l1",
    });
  });

  describe("Add SQL row (bottom button)", () => {
    it("dispatches select/addSqlStep when the Add SQL row button is clicked", () => {
      const dispatch = vi.fn();
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1" }), makeSqlStep({ id: "sql-2" })],
      };
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByText("Add SQL row"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/addSqlStep",
        id: expect.any(String),
      });
    });
  });

  describe("Per-block add option menu", () => {
    it("adds the format section (defaulting to CSV) via the dropdown menu", () => {
      const dispatch = vi.fn();
      render(<SelectStageEditor step={baseStep} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Add option for SQL"));
      fireEvent.click(screen.getByText("Format"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/addFormatSection",
        stepId: "sql-1",
        section: "csv",
        fieldId: expect.any(String),
      });
    });

    it("greys out Format once a format is already added", () => {
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["csv"] })],
      };
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      fireEvent.click(screen.getByLabelText("Add option for SQL"));
      expect(screen.getByRole("menuitem", { name: "Format" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("keeps Export and As label enabled regardless of which input format is active", () => {
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["csv"] })],
      };
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      fireEvent.click(screen.getByLabelText("Add option for SQL"));
      expect(
        screen.getByRole("menuitem", { name: "Export" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("menuitem", { name: "As label" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("keeps Add option enabled even when a format and Export are both already added", () => {
      const step: SelectTransformStep = {
        sqlSteps: [
          makeSqlStep({
            id: "sql-1",
            formatSections: ["parquet", "export"],
          }),
        ],
      };
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      expect(screen.getByLabelText("Add option for SQL")).not.toBeDisabled();
    });
  });

  describe("Format section", () => {
    it("shows CSV's has-headers checkbox only when CSV is the active format", () => {
      const step: SelectTransformStep = {
        sqlSteps: [
          makeSqlStep({
            id: "sql-1",
            formatSections: ["csv"],
            csv: { hasHeaders: true },
          }),
        ],
      };
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("hides the has-headers checkbox when JSON or Parquet is active", () => {
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["parquet"] })],
      };
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("reports toggling the has-headers checkbox", () => {
      const dispatch = vi.fn();
      const step: SelectTransformStep = {
        sqlSteps: [
          makeSqlStep({
            id: "sql-1",
            formatSections: ["csv"],
            csv: { hasHeaders: true },
          }),
        ],
      };
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByRole("checkbox"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/changeCsv",
        stepId: "sql-1",
        changes: { hasHeaders: false },
      });
    });

    it("switches from CSV to JSON via the segmented control", () => {
      const dispatch = vi.fn();
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["csv"] })],
      };
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByText("JSON"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/changeFormat",
        stepId: "sql-1",
        format: "json",
        fieldId: expect.any(String),
      });
    });

    it("switches to Protobuf via the segmented control", () => {
      const dispatch = vi.fn();
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["csv"] })],
      };
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByText("Protobuf"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/changeFormat",
        stepId: "sql-1",
        format: "protobuf",
        fieldId: expect.any(String),
      });
    });

    it("removes the section via its remove button", () => {
      const dispatch = vi.fn();
      const step: SelectTransformStep = {
        sqlSteps: [makeSqlStep({ id: "sql-1", formatSections: ["parquet"] })],
      };
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Remove sql format"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/removeFormatSection",
        stepId: "sql-1",
        section: "parquet",
      });
    });

    describe("when Protobuf is the active format", () => {
      const step: SelectTransformStep = {
        sqlSteps: [
          makeSqlStep({
            id: "sql-1",
            formatSections: ["protobuf"],
            protobuf: {
              messageName: "Telemetry",
              schema: "message Telemetry { double temp = 1; }",
              fields: [
                {
                  id: "f1",
                  column: "temperature",
                  fieldId: "1",
                  fieldType: "double",
                },
              ],
            },
          }),
        ],
      };

      it("hides the has-headers checkbox", () => {
        render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
        expect(screen.queryByRole("checkbox")).toBeNull();
      });

      it("shows the current message name and schema", () => {
        render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
        expect(screen.getByPlaceholderText("message name")).toHaveValue(
          "Telemetry",
        );
        expect(
          screen.getByPlaceholderText("schema (.proto content)"),
        ).toHaveValue("message Telemetry { double temp = 1; }");
      });

      it("reports edits to the message name and schema", () => {
        const dispatch = vi.fn();
        render(<SelectStageEditor step={step} dispatch={dispatch} />);
        fireEvent.change(screen.getByPlaceholderText("message name"), {
          target: { value: "Reading" },
        });
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/changeProtobuf",
          stepId: "sql-1",
          changes: { messageName: "Reading" },
        });

        fireEvent.change(
          screen.getByPlaceholderText("schema (.proto content)"),
          {
            target: { value: "message Reading {}" },
          },
        );
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/changeProtobuf",
          stepId: "sql-1",
          changes: { schema: "message Reading {}" },
        });
      });

      it("shows the current field row and reports a column edit", () => {
        const dispatch = vi.fn();
        render(<SelectStageEditor step={step} dispatch={dispatch} />);
        expect(screen.getByPlaceholderText("column")).toHaveValue(
          "temperature",
        );
        fireEvent.change(screen.getByPlaceholderText("column"), {
          target: { value: "humidity" },
        });
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/changeProtobufFieldRow",
          stepId: "sql-1",
          id: "f1",
          changes: { column: "humidity" },
        });
      });

      it("adds another field row via the dedicated add button", () => {
        const dispatch = vi.fn();
        render(<SelectStageEditor step={step} dispatch={dispatch} />);
        fireEvent.click(screen.getByLabelText("Add protobuf field"));
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/addProtobufFieldRow",
          stepId: "sql-1",
          id: expect.any(String),
        });
      });

      it("removes a field row directly", () => {
        const dispatch = vi.fn();
        render(<SelectStageEditor step={step} dispatch={dispatch} />);
        fireEvent.click(screen.getByLabelText("Remove protobuf field"));
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/removeProtobufFieldRow",
          stepId: "sql-1",
          id: "f1",
        });
      });

      it("removes the whole section via its remove button", () => {
        const dispatch = vi.fn();
        render(<SelectStageEditor step={step} dispatch={dispatch} />);
        fireEvent.click(screen.getByLabelText("Remove sql format"));
        expect(dispatch).toHaveBeenCalledWith({
          type: "select/removeFormatSection",
          stepId: "sql-1",
          section: "protobuf",
        });
      });
    });
  });

  describe("Export section", () => {
    const step: SelectTransformStep = {
      sqlSteps: [
        makeSqlStep({
          id: "sql-1",
          formatSections: ["export"],
          export: { format: "parquet", rows: "1000", duration: "1m" },
        }),
      ],
    };

    it("shows the current format, rows, and duration", () => {
      render(<SelectStageEditor step={step} dispatch={vi.fn()} />);
      expect(screen.getByText("parquet")).toBeTruthy();
      expect(screen.getByPlaceholderText("max rows")).toHaveValue("1000");
      expect(screen.getByPlaceholderText("max duration (e.g. 1m)")).toHaveValue(
        "1m",
      );
    });

    it("reports a changed duration", () => {
      const dispatch = vi.fn();
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.change(screen.getByPlaceholderText("max duration (e.g. 1m)"), {
        target: { value: "5m" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/changeExport",
        stepId: "sql-1",
        changes: { duration: "5m" },
      });
    });

    it("reports a changed row count", () => {
      const dispatch = vi.fn();
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.change(screen.getByPlaceholderText("max rows"), {
        target: { value: "500" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/changeExport",
        stepId: "sql-1",
        changes: { rows: "500" },
      });
    });

    it("removes the section via its remove button", () => {
      const dispatch = vi.fn();
      render(<SelectStageEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Remove sql export"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "select/removeFormatSection",
        stepId: "sql-1",
        section: "export",
      });
    });
  });
});
