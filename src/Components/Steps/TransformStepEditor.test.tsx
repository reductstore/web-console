import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TransformStepEditor from "./TransformStepEditor";
import { RosTransformStep } from "../../Helpers/transformStepBuilder";

const baseStep: RosTransformStep = {
  sections: [],
  topic: "",
  encode: [],
  asLabel: [],
  export: { format: "", duration: "", size: "" },
};

const noopHandlers = {
  onAddSection: vi.fn(),
  onRemoveSection: vi.fn(),
  onChangeTopic: vi.fn(),
  onAddEncodeRow: vi.fn(),
  onChangeEncodeRow: vi.fn(),
  onRemoveEncodeRow: vi.fn(),
  onAddAsLabelRow: vi.fn(),
  onChangeAsLabelRow: vi.fn(),
  onRemoveAsLabelRow: vi.fn(),
  onChangeExport: vi.fn(),
};

describe("TransformStepEditor", () => {
  it("shows only the Add option menu when no section is added", () => {
    render(<TransformStepEditor step={baseStep} {...noopHandlers} />);
    expect(screen.getByLabelText("Add option")).toBeTruthy();
    expect(
      screen.queryByPlaceholderText("optional ROS topic filter"),
    ).toBeNull();
  });

  it("adds a section via the dropdown menu", async () => {
    const onAddSection = vi.fn();
    render(
      <TransformStepEditor
        step={baseStep}
        {...noopHandlers}
        onAddSection={onAddSection}
      />,
    );
    fireEvent.click(screen.getByLabelText("Add option"));
    fireEvent.click(await screen.findByText("Filter"));
    expect(onAddSection).toHaveBeenCalledWith("filter");
  });

  it("greys out Export once Filter/Encode/Label is added, and vice versa, but always shows all four options", async () => {
    const withFilter: RosTransformStep = {
      ...baseStep,
      sections: ["filter"],
      topic: "/robot/odom",
    };
    render(<TransformStepEditor step={withFilter} {...noopHandlers} />);
    fireEvent.click(screen.getByLabelText("Add option"));
    expect(
      await screen.findByRole("menuitem", { name: "Encode" }),
    ).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("menuitem", { name: "Export" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("greys out all four options once Export is added, since it's mutually exclusive with the other three", async () => {
    const withExport: RosTransformStep = {
      ...baseStep,
      sections: ["export"],
      export: { format: "mcap", duration: "", size: "" },
    };
    render(<TransformStepEditor step={withExport} {...noopHandlers} />);
    fireEvent.click(screen.getByLabelText("Add option"));
    for (const name of ["Filter", "Encode", "As label", "Export"]) {
      expect(await screen.findByRole("menuitem", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
  });

  it("keeps Add option enabled even when every section is already added", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["filter", "encode", "label", "export"],
      encode: [{ id: "e1", key: "", value: "" }],
      asLabel: [{ id: "l1", key: "", value: "" }],
    };
    render(<TransformStepEditor step={step} {...noopHandlers} />);
    expect(screen.getByLabelText("Add option")).not.toBeDisabled();
  });

  describe("Filter section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["filter"],
      topic: "/robot/odom",
    };

    it("shows the current topic", () => {
      render(<TransformStepEditor step={step} {...noopHandlers} />);
      expect(
        screen.getByPlaceholderText("optional ROS topic filter"),
      ).toHaveValue("/robot/odom");
    });

    it("reports a typed topic", () => {
      const onChangeTopic = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onChangeTopic={onChangeTopic}
        />,
      );
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/camera/image" } },
      );
      expect(onChangeTopic).toHaveBeenCalledWith("/camera/image");
    });

    it("removes the section via its remove button", () => {
      const onRemoveSection = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onRemoveSection={onRemoveSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove filter"));
      expect(onRemoveSection).toHaveBeenCalledWith("filter");
    });
  });

  describe("Encode section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["encode"],
      encode: [{ id: "e1", key: "data", value: "jpeg" }],
    };

    it("renders a row and reports edits", () => {
      const onChangeEncodeRow = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onChangeEncodeRow={onChangeEncodeRow}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("field (e.g. data)"), {
        target: { value: "image" },
      });
      expect(onChangeEncodeRow).toHaveBeenCalledWith("e1", { key: "image" });

      fireEvent.change(screen.getByPlaceholderText("encoding (e.g. jpeg)"), {
        target: { value: "base64" },
      });
      expect(onChangeEncodeRow).toHaveBeenCalledWith("e1", {
        value: "base64",
      });
    });

    it("removes the whole section when the only row's remove button is clicked", () => {
      const onRemoveSection = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onRemoveSection={onRemoveSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove encode"));
      expect(onRemoveSection).toHaveBeenCalledWith("encode");
    });

    it("adds another encode row when Encode is picked again from the menu", async () => {
      const onAddEncodeRow = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onAddEncodeRow={onAddEncodeRow}
        />,
      );
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Encode" }));
      expect(onAddEncodeRow).toHaveBeenCalled();
    });

    it("still allows adding another encode row even when the last row is incomplete", async () => {
      const onAddEncodeRow = vi.fn();
      const partial: RosTransformStep = {
        ...baseStep,
        sections: ["encode"],
        encode: [{ id: "e1", key: "data", value: "" }],
      };
      render(
        <TransformStepEditor
          step={partial}
          {...noopHandlers}
          onAddEncodeRow={onAddEncodeRow}
        />,
      );
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Encode" }));
      expect(onAddEncodeRow).toHaveBeenCalled();
    });
  });

  describe("Label section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["label"],
      asLabel: [{ id: "l1", key: "speed", value: "speed" }],
    };

    it("renders a row and reports edits", () => {
      const onChangeAsLabelRow = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onChangeAsLabelRow={onChangeAsLabelRow}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "velocity" },
      });
      expect(onChangeAsLabelRow).toHaveBeenCalledWith("l1", {
        key: "velocity",
      });

      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "data.speed" },
      });
      expect(onChangeAsLabelRow).toHaveBeenCalledWith("l1", {
        value: "data.speed",
      });
    });

    it("calls onRemoveAsLabelRow with the row's id", () => {
      const onRemoveAsLabelRow = vi.fn();
      const twoRows: RosTransformStep = {
        ...baseStep,
        sections: ["label"],
        asLabel: [
          { id: "l1", key: "speed", value: "speed" },
          { id: "l2", key: "accel", value: "accel" },
        ],
      };
      render(
        <TransformStepEditor
          step={twoRows}
          {...noopHandlers}
          onRemoveAsLabelRow={onRemoveAsLabelRow}
        />,
      );
      const [firstRemove] = screen.getAllByLabelText("Remove label mapping");
      fireEvent.click(firstRemove);
      expect(onRemoveAsLabelRow).toHaveBeenCalledWith("l1");
    });

    it("removes the whole section via its remove button", () => {
      const onRemoveSection = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onRemoveSection={onRemoveSection}
        />,
      );
      fireEvent.click(screen.getByLabelText("Remove as label"));
      expect(onRemoveSection).toHaveBeenCalledWith("label");
    });
  });

  describe("Export section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["export"],
      export: { format: "mcap", duration: "1m", size: "100MB" },
    };

    it("shows the current format, duration, and size", () => {
      render(<TransformStepEditor step={step} {...noopHandlers} />);
      expect(
        screen.getByPlaceholderText("mcap (currently the only format)"),
      ).toHaveValue("mcap");
      expect(screen.getByPlaceholderText("max duration (e.g. 1m)")).toHaveValue(
        "1m",
      );
      expect(screen.getByPlaceholderText("max size (e.g. 100MB)")).toHaveValue(
        "100MB",
      );
    });

    it("reports edits to each field", () => {
      const onChangeExport = vi.fn();
      render(
        <TransformStepEditor
          step={step}
          {...noopHandlers}
          onChangeExport={onChangeExport}
        />,
      );
      fireEvent.change(screen.getByPlaceholderText("max duration (e.g. 1m)"), {
        target: { value: "5m" },
      });
      expect(onChangeExport).toHaveBeenCalledWith({ duration: "5m" });
    });
  });
});
