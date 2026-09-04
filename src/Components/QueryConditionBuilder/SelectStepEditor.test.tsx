import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SelectStepEditor from "./SelectStepEditor";
import { SelectTransformStep } from "../../Helpers/transformStepBuilder";

const baseStep: SelectTransformStep = {
  sql: "",
  asLabel: [],
  formatSections: [],
  csv: { hasHeaders: false },
  protobuf: { messageName: "", schema: "", fields: [] },
  export: { format: "", rows: "", duration: "" },
};

const noopHandlers = {
  onChangeSql: vi.fn(),
  onAddFormatSection: vi.fn(),
  onRemoveFormatSection: vi.fn(),
  onChangeFormat: vi.fn(),
  onChangeCsv: vi.fn(),
  onChangeProtobuf: vi.fn(),
  onAddProtobufFieldRow: vi.fn(),
  onChangeProtobufFieldRow: vi.fn(),
  onRemoveProtobufFieldRow: vi.fn(),
  onChangeSelectExport: vi.fn(),
  onAddAsLabelRow: vi.fn(),
  onChangeAsLabelRow: vi.fn(),
  onRemoveAsLabelRow: vi.fn(),
};

describe("SelectStepEditor", () => {
  it("shows the SQL input with the current value", () => {
    render(
      <SelectStepEditor
        step={{ ...baseStep, sql: "SELECT * FROM ENTRY()" }}
        {...noopHandlers}
      />,
    );
    expect(screen.getByPlaceholderText("SELECT * FROM ENTRY()")).toHaveValue(
      "SELECT * FROM ENTRY()",
    );
  });

  it("reports a typed SQL expression", () => {
    const onChangeSql = vi.fn();
    render(
      <SelectStepEditor
        step={baseStep}
        {...noopHandlers}
        onChangeSql={onChangeSql}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("SELECT * FROM ENTRY()"), {
      target: { value: "SELECT temp.value FROM ENTRY()" },
    });
    expect(onChangeSql).toHaveBeenCalledWith("SELECT temp.value FROM ENTRY()");
  });

  it("hides the As label section when there are no rows", () => {
    render(<SelectStepEditor step={baseStep} {...noopHandlers} />);
    expect(screen.queryByText("As label")).toBeNull();
  });

  it("calls onAddAsLabelRow when As label is picked from the add menu", () => {
    const onAddAsLabelRow = vi.fn();
    render(
      <SelectStepEditor
        step={baseStep}
        {...noopHandlers}
        onAddAsLabelRow={onAddAsLabelRow}
      />,
    );
    fireEvent.click(screen.getByLabelText("Add option"));
    fireEvent.click(screen.getByText("As label"));
    expect(onAddAsLabelRow).toHaveBeenCalled();
  });

  it("shows As label rows and reports a changed field", () => {
    const onChangeAsLabelRow = vi.fn();
    const step: SelectTransformStep = {
      ...baseStep,
      asLabel: [{ id: "l1", key: "", value: "" }],
    };
    render(
      <SelectStepEditor
        step={step}
        {...noopHandlers}
        onChangeAsLabelRow={onChangeAsLabelRow}
      />,
    );
    expect(screen.getByText("As label")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
      target: { value: "speed" },
    });
    expect(onChangeAsLabelRow).toHaveBeenCalledWith("l1", { key: "speed" });
  });

  it("removes a row directly when other rows remain", () => {
    const onRemoveAsLabelRow = vi.fn();
    const step: SelectTransformStep = {
      ...baseStep,
      asLabel: [
        { id: "l1", key: "speed", value: "vector.x" },
        { id: "l2", key: "heading", value: "vector.y" },
      ],
    };
    render(
      <SelectStepEditor
        step={step}
        {...noopHandlers}
        onRemoveAsLabelRow={onRemoveAsLabelRow}
      />,
    );
    fireEvent.click(screen.getAllByLabelText("Remove label mapping")[0]);
    expect(onRemoveAsLabelRow).toHaveBeenCalledWith("l1");
  });

  it("removes the only row through the same handler", () => {
    const onRemoveAsLabelRow = vi.fn();
    const step: SelectTransformStep = {
      ...baseStep,
      asLabel: [{ id: "l1", key: "speed", value: "vector.x" }],
    };
    render(
      <SelectStepEditor
        step={step}
        {...noopHandlers}
        onRemoveAsLabelRow={onRemoveAsLabelRow}
      />,
    );
    fireEvent.click(screen.getByLabelText("Remove label mapping"));
    expect(onRemoveAsLabelRow).toHaveBeenCalledWith("l1");
  });

  it("links to the ReductSelect documentation", () => {
    render(<SelectStepEditor step={baseStep} {...noopHandlers} />);
    const link = screen.getByText("View ReductSelect Documentation →");
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "https://www.reduct.store/docs/extensions/official/select-ext",
    );
  });

  describe("Add option menu", () => {
    it("adds the format section (defaulting to CSV) via the dropdown menu", () => {
      const onAddFormatSection = vi.fn();
      render(
        <SelectStepEditor
          step={baseStep}
          {...noopHandlers}
          onAddFormatSection={onAddFormatSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(screen.getByText("Format"));
      expect(onAddFormatSection).toHaveBeenCalledWith("csv");
    });

    it("greys out Format and Protobuf once one of them is added, but always shows both", () => {
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["csv"],
      };
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      fireEvent.click(screen.getByLabelText("Add option"));
      expect(screen.getByRole("menuitem", { name: "Format" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(
        screen.getByRole("menuitem", { name: "Protobuf" }),
      ).toHaveAttribute("aria-disabled", "true");
    });

    it("keeps Export and As label enabled regardless of which input format is active", () => {
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["csv"],
      };
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      fireEvent.click(screen.getByLabelText("Add option"));
      expect(
        screen.getByRole("menuitem", { name: "Export" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("menuitem", { name: "As label" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("adds another protobuf field row when Protobuf is picked again from the menu", () => {
      const onAddProtobufFieldRow = vi.fn();
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["protobuf"],
        protobuf: {
          messageName: "",
          schema: "",
          fields: [{ id: "f1", column: "", fieldId: "", fieldType: "" }],
        },
      };
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onAddProtobufFieldRow={onAddProtobufFieldRow}
        />,
      );
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(screen.getByRole("menuitem", { name: "Protobuf" }));
      expect(onAddProtobufFieldRow).toHaveBeenCalled();
    });

    it("keeps Add option enabled even when a format and Export are both already added", () => {
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["parquet", "export"],
      };
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      expect(screen.getByLabelText("Add option")).not.toBeDisabled();
    });
  });

  describe("Format section", () => {
    it("shows CSV's has-headers checkbox only when CSV is the active format", () => {
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["csv"],
        csv: { hasHeaders: true },
      };
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("hides the has-headers checkbox when JSON or Parquet is active", () => {
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["parquet"],
      };
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      expect(screen.queryByRole("checkbox")).toBeNull();
    });

    it("reports toggling the has-headers checkbox", () => {
      const onChangeCsv = vi.fn();
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["csv"],
        csv: { hasHeaders: true },
      };
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeCsv={onChangeCsv}
        />,
      );
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onChangeCsv).toHaveBeenCalledWith({ hasHeaders: false });
    });

    it("switches from CSV to JSON via the segmented control", () => {
      const onChangeFormat = vi.fn();
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["csv"],
      };
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeFormat={onChangeFormat}
        />,
      );
      fireEvent.click(screen.getByText("JSON"));
      expect(onChangeFormat).toHaveBeenCalledWith("json");
    });

    it("removes the section via its remove button", () => {
      const onRemoveFormatSection = vi.fn();
      const step: SelectTransformStep = {
        ...baseStep,
        formatSections: ["parquet"],
      };
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onRemoveFormatSection={onRemoveFormatSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove format"));
      expect(onRemoveFormatSection).toHaveBeenCalledWith("parquet");
    });
  });

  describe("Protobuf section", () => {
    const step: SelectTransformStep = {
      ...baseStep,
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
    };

    it("shows the current message name and schema", () => {
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      expect(screen.getByPlaceholderText("message name")).toHaveValue(
        "Telemetry",
      );
      expect(
        screen.getByPlaceholderText("schema (.proto content)"),
      ).toHaveValue("message Telemetry { double temp = 1; }");
    });

    it("reports edits to the message name and schema", () => {
      const onChangeProtobuf = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeProtobuf={onChangeProtobuf}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("message name"), {
        target: { value: "Reading" },
      });
      expect(onChangeProtobuf).toHaveBeenCalledWith({ messageName: "Reading" });

      fireEvent.change(screen.getByPlaceholderText("schema (.proto content)"), {
        target: { value: "message Reading {}" },
      });
      expect(onChangeProtobuf).toHaveBeenCalledWith({
        schema: "message Reading {}",
      });
    });

    it("shows the current field row and reports a column edit", () => {
      const onChangeProtobufFieldRow = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeProtobufFieldRow={onChangeProtobufFieldRow}
        />,
      );
      expect(screen.getByPlaceholderText("column")).toHaveValue("temperature");
      fireEvent.change(screen.getByPlaceholderText("column"), {
        target: { value: "humidity" },
      });
      expect(onChangeProtobufFieldRow).toHaveBeenCalledWith("f1", {
        column: "humidity",
      });
    });

    it("removes a field row directly", () => {
      const onRemoveProtobufFieldRow = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onRemoveProtobufFieldRow={onRemoveProtobufFieldRow}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove protobuf field"));
      expect(onRemoveProtobufFieldRow).toHaveBeenCalledWith("f1");
    });

    it("removes the whole section via its remove button", () => {
      const onRemoveFormatSection = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onRemoveFormatSection={onRemoveFormatSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove protobuf"));
      expect(onRemoveFormatSection).toHaveBeenCalledWith("protobuf");
    });
  });

  describe("Export section", () => {
    const step: SelectTransformStep = {
      ...baseStep,
      formatSections: ["export"],
      export: { format: "parquet", rows: "1000", duration: "1m" },
    };

    it("shows the current format, rows, and duration", () => {
      render(<SelectStepEditor step={step} {...noopHandlers} />);
      expect(screen.getByText("parquet")).toBeTruthy();
      expect(screen.getByPlaceholderText("max rows")).toHaveValue("1000");
      expect(screen.getByPlaceholderText("max duration (e.g. 1m)")).toHaveValue(
        "1m",
      );
    });

    it("reports a changed duration", () => {
      const onChangeSelectExport = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeSelectExport={onChangeSelectExport}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("max duration (e.g. 1m)"), {
        target: { value: "5m" },
      });
      expect(onChangeSelectExport).toHaveBeenCalledWith({ duration: "5m" });
    });

    it("reports a changed row count", () => {
      const onChangeSelectExport = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onChangeSelectExport={onChangeSelectExport}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("max rows"), {
        target: { value: "500" },
      });
      expect(onChangeSelectExport).toHaveBeenCalledWith({ rows: "500" });
    });

    it("removes the section via its remove button", () => {
      const onRemoveFormatSection = vi.fn();
      render(
        <SelectStepEditor
          step={step}
          {...noopHandlers}
          onRemoveFormatSection={onRemoveFormatSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove export"));
      expect(onRemoveFormatSection).toHaveBeenCalledWith("export");
    });
  });
});
