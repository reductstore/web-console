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

describe("TransformStepEditor", () => {
  it("shows only the Add option menu when no section is added", () => {
    render(<TransformStepEditor step={baseStep} dispatch={vi.fn()} />);
    expect(screen.getByLabelText("Add option")).toBeTruthy();
    expect(
      screen.queryByPlaceholderText("optional ROS topic filter"),
    ).toBeNull();
  });

  it("adds a section via the dropdown menu", async () => {
    const dispatch = vi.fn();
    render(<TransformStepEditor step={baseStep} dispatch={dispatch} />);
    fireEvent.click(screen.getByLabelText("Add option"));
    fireEvent.click(await screen.findByText("Filter"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "ros/addSection",
      section: "filter",
    });
  });

  it("greys out Export once Filter/Encode/Label is added, and vice versa, but always shows all four options", async () => {
    const withFilter: RosTransformStep = {
      ...baseStep,
      sections: ["filter"],
      topic: "/robot/odom",
    };
    render(<TransformStepEditor step={withFilter} dispatch={vi.fn()} />);
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
    render(<TransformStepEditor step={withExport} dispatch={vi.fn()} />);
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
    render(<TransformStepEditor step={step} dispatch={vi.fn()} />);
    expect(screen.getByLabelText("Add option")).not.toBeDisabled();
  });

  describe("Filter section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["filter"],
      topic: "/robot/odom",
    };

    it("shows the current topic", () => {
      render(<TransformStepEditor step={step} dispatch={vi.fn()} />);
      expect(
        screen.getByPlaceholderText("optional ROS topic filter"),
      ).toHaveValue("/robot/odom");
    });

    it("reports a typed topic", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/camera/image" } },
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeTopic",
        topic: "/camera/image",
      });
    });

    it("removes the section via its remove button", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Remove filter"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/removeSection",
        section: "filter",
      });
    });
  });

  describe("Encode section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["encode"],
      encode: [{ id: "e1", key: "data", value: "jpeg" }],
    };

    it("renders a row and reports edits", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.change(screen.getByPlaceholderText("field (e.g. data)"), {
        target: { value: "image" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeEncodeRow",
        id: "e1",
        changes: { key: "image" },
      });

      fireEvent.change(screen.getByPlaceholderText("encoding (e.g. jpeg)"), {
        target: { value: "base64" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeEncodeRow",
        id: "e1",
        changes: { value: "base64" },
      });
    });

    it("removes the whole section when the only row's remove button is clicked", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Remove encode"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/removeSection",
        section: "encode",
      });
    });

    it("adds another encode row when Encode is picked again from the menu", async () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Encode" }));
      expect(dispatch).toHaveBeenCalledWith({ type: "ros/addEncodeRow" });
    });

    it("still allows adding another encode row even when the last row is incomplete", async () => {
      const dispatch = vi.fn();
      const partial: RosTransformStep = {
        ...baseStep,
        sections: ["encode"],
        encode: [{ id: "e1", key: "data", value: "" }],
      };
      render(<TransformStepEditor step={partial} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Add option"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Encode" }));
      expect(dispatch).toHaveBeenCalledWith({ type: "ros/addEncodeRow" });
    });
  });

  describe("Label section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["label"],
      asLabel: [{ id: "l1", key: "speed", value: "speed" }],
    };

    it("renders a row and reports edits", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "velocity" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeAsLabelRow",
        id: "l1",
        changes: { key: "velocity" },
      });

      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "data.speed" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeAsLabelRow",
        id: "l1",
        changes: { value: "data.speed" },
      });
    });

    it("calls dispatch with ros/removeAsLabelRow and the row's id", () => {
      const dispatch = vi.fn();
      const twoRows: RosTransformStep = {
        ...baseStep,
        sections: ["label"],
        asLabel: [
          { id: "l1", key: "speed", value: "speed" },
          { id: "l2", key: "accel", value: "accel" },
        ],
      };
      render(<TransformStepEditor step={twoRows} dispatch={dispatch} />);
      const [firstRemove] = screen.getAllByLabelText("Remove label mapping");
      fireEvent.click(firstRemove);
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/removeAsLabelRow",
        id: "l1",
      });
    });

    it("removes the whole section via its remove button", () => {
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.click(screen.getByLabelText("Remove as label"));
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/removeSection",
        section: "label",
      });
    });
  });

  describe("Export section", () => {
    const step: RosTransformStep = {
      ...baseStep,
      sections: ["export"],
      export: { format: "mcap", duration: "1m", size: "100MB" },
    };

    it("shows the current format, duration, and size", () => {
      render(<TransformStepEditor step={step} dispatch={vi.fn()} />);
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
      const dispatch = vi.fn();
      render(<TransformStepEditor step={step} dispatch={dispatch} />);
      fireEvent.change(screen.getByPlaceholderText("max duration (e.g. 1m)"), {
        target: { value: "5m" },
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: "ros/changeExport",
        changes: { duration: "5m" },
      });
    });
  });
});
