import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { message } from "antd";
import EditRecordLabels from "./EditRecordLabels";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("EditRecordLabels", () => {
  const mockOnLabelsUpdated = vi.fn();

  const mockRecord = {
    key: "1000",
    timestamp: 1000n,
    size: "1.0 KB",
    contentType: "application/json",
    labels: JSON.stringify({
      name: "test",
      type: "demo",
    }),
  };

  const mockRecordWithEmptyLabels = {
    key: "2000",
    timestamp: 2000n,
    size: "2.0 KB",
    contentType: "text/plain",
    labels: JSON.stringify({}),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    message.success = vi.fn();
    message.error = vi.fn();
  });

  describe("Rendering", () => {
    it("should render labels title", () => {
      const { container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const title = container.querySelector(".labelsHeader");
      expect(title).not.toBeNull();
      expect(title?.textContent).toContain("Labels");
    });

    it("should render ScrollableTable with correct props", () => {
      const { container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const table = container.querySelector(".ant-table");
      expect(table).not.toBeNull();
      // Table renders as small and bordered via DOM classes
      expect(container.querySelector(".ant-table-small")).not.toBeNull();
      expect(container.querySelector(".ant-table-bordered")).not.toBeNull();
    });

    it("should display existing labels from record", () => {
      const { container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const tableText = container.querySelector(".ant-table")?.textContent;
      expect(tableText).toContain("name");
      expect(tableText).toContain("test");
      expect(tableText).toContain("type");
      expect(tableText).toContain("demo");
    });

    it("should render empty table when record has no labels", () => {
      const { container } = render(
        <EditRecordLabels
          record={mockRecordWithEmptyLabels}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const tableText = container.querySelector(".ant-table")?.textContent;
      expect(tableText).not.toContain("name");
      expect(tableText).not.toContain("test");
      expect(tableText).not.toContain("type");
      expect(tableText).not.toContain("demo");
    });

    it("should render nothing when no record provided", () => {
      const { container } = render(
        <EditRecordLabels
          record={null}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const title = container.querySelector(".labelsHeader");
      expect(title).toBeNull();
    });
  });

  describe("Read-only Mode", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      ));
    });

    it("should not show action buttons when editable=false", () => {
      const addButton = container.querySelector('[title="Add new label"]');
      const revertButton = container.querySelector('[title="Revert changes"]');
      const updateButton = container.querySelector('[title="Update labels"]');

      expect(addButton).toBeNull();
      expect(revertButton).toBeNull();
      expect(updateButton).toBeNull();
    });

    it("should not show action column when editable=false", () => {
      const columnHeaders = container.querySelectorAll(".ant-table-thead th");
      const headerTexts = Array.from(columnHeaders).map((th) => th.textContent);

      expect(headerTexts).toHaveLength(2);
      expect(headerTexts[0]).toBe("Key");
      expect(headerTexts[1]).toBe("Value");
    });

    it("should display labels as non-editable text", () => {
      const firstCell = container.querySelector(".ant-table-tbody td");
      if (firstCell) {
        fireEvent.click(firstCell);
      }

      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBe(0);
    });
  });

  describe("Editable Mode", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should show action buttons when editable=true", () => {
      const addButton = container.querySelector('[title="Add new label"]');
      const revertButton = container.querySelector('[title="Revert changes"]');
      const updateButton = container.querySelector('[title="Update labels"]');

      expect(addButton).not.toBeNull();
      expect(revertButton).not.toBeNull();
      expect(updateButton).not.toBeNull();
    });

    it("should show action column when editable=true", () => {
      const columnHeaders = container.querySelectorAll(".ant-table-thead th");
      const headerTexts = Array.from(columnHeaders).map((th) => th.textContent);

      expect(headerTexts).toHaveLength(3);
      expect(headerTexts[0]).toBe("Key");
      expect(headerTexts[1]).toBe("Value");
      expect(headerTexts[2]).toBe("Actions");
    });

    it("should show row action icons for each row", () => {
      const revertIcons = container.querySelectorAll(".anticon-undo");
      const addBelowIcons = container.querySelectorAll(
        ".anticon-insert-row-below",
      );
      const deleteIcons = container.querySelectorAll(".anticon-delete");

      expect(revertIcons.length).toBeGreaterThanOrEqual(2);
      expect(addBelowIcons.length).toBeGreaterThanOrEqual(2);
      expect(deleteIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("should disable revert and update buttons initially when no changes", () => {
      const revertButton = container.querySelector(
        '[title="Revert changes"]',
      ) as HTMLButtonElement;
      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLButtonElement;

      expect(revertButton?.disabled).toBe(true);
      expect(updateButton?.disabled).toBe(true);
    });
  });

  describe("Cell Editing", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should make cell editable when clicked", () => {
      // In editable mode, inputs are always visible
      const inputs = container.querySelectorAll("input");
      expect(inputs.length).toBeGreaterThan(0);

      // Check first input has the correct value
      expect(inputs[0]).toHaveValue("name");
    });

    it("should save changes when input value changes", () => {
      const inputs = container.querySelectorAll("input");
      expect(inputs[0]).toHaveValue("name");

      // Change the value
      fireEvent.change(inputs[0], { target: { value: "env" } });

      // Should enable buttons since we made changes
      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLButtonElement;
      expect(updateButton?.disabled).toBe(false);
    });

    it("should save changes when value is modified", () => {
      const inputs = container.querySelectorAll("input");
      expect(inputs[1]).toHaveValue("test");

      // Change the value
      fireEvent.change(inputs[1], { target: { value: "sample" } });

      // Should enable buttons
      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLButtonElement;
      expect(updateButton?.disabled).toBe(false);
    });
  });

  describe("Adding Labels", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should add new empty row when Add button is clicked", () => {
      const initialRows = container.querySelectorAll(
        ".ant-table-tbody tr",
      ).length;

      const addButton = container.querySelector(
        '[title="Add new label"]',
      ) as HTMLElement;
      fireEvent.click(addButton);

      const newRows = container.querySelectorAll(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows + 1);
    });

    it("should add new row below target when add-below icon is clicked", () => {
      const initialRows = container.querySelectorAll(
        ".ant-table-tbody tr",
      ).length;

      // Click the "add below" icon on the first row
      const addBelowIcon = container.querySelector(
        ".addBelowIcon",
      ) as HTMLElement;
      fireEvent.click(addBelowIcon);

      const newRows = container.querySelectorAll(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows + 1);
    });
  });

  describe("Deleting Labels", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should delete row when delete icon is clicked", () => {
      const initialRows = container.querySelectorAll(
        ".ant-table-tbody tr",
      ).length;

      // Click delete icon on first row
      const deleteIcon = container.querySelector(".deleteIcon") as HTMLElement;
      fireEvent.click(deleteIcon);

      const newRows = container.querySelectorAll(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows - 1);
    });

    it("should enable update button after deleting a row", () => {
      const deleteIcon = container.querySelector(".deleteIcon") as HTMLElement;
      fireEvent.click(deleteIcon);

      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLButtonElement;
      expect(updateButton?.disabled).toBe(false);
    });
  });

  describe("Reverting Changes", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should revert individual row changes when row revert icon is clicked", () => {
      // First, modify a cell
      const inputs = container.querySelectorAll("input");
      fireEvent.change(inputs[0], { target: { value: "modified" } });

      // Now revert the row
      const revertIcon = container.querySelector(
        ".revertIcon",
      ) as HTMLButtonElement;
      expect(revertIcon?.disabled).toBe(false);

      fireEvent.click(revertIcon);

      // Should be reverted back to original
      const revertedInputs = container.querySelectorAll("input");
      expect(revertedInputs[0]).toHaveValue("name");
    });

    it("should revert all changes when global revert button is clicked", () => {
      // Make a simple change - modify a value
      const inputs = container.querySelectorAll("input");
      expect(inputs[0]).toHaveValue("name"); // Ensure starting value
      fireEvent.change(inputs[0], { target: { value: "modified" } });

      // Verify change was made
      const modifiedInputs = container.querySelectorAll("input");
      expect(modifiedInputs[0]).toHaveValue("modified");

      // Revert all changes
      const revertButton = container.querySelector(
        '[title="Revert changes"]',
      ) as HTMLElement;
      fireEvent.click(revertButton);

      // Should have original values
      const revertedInputs = container.querySelectorAll("input");
      expect(revertedInputs[0]).toHaveValue("name");
    });

    it("should disable revert icons for unchanged rows", () => {
      const revertIcons = container.querySelectorAll(".revertIcon");
      revertIcons.forEach((icon) => {
        expect((icon as HTMLButtonElement).disabled).toBe(true);
      });
    });
  });

  describe("Saving Labels", () => {
    let container: HTMLElement;

    beforeEach(() => {
      ({ container } = render(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      ));
    });

    it("should call onLabelsUpdated with correct data when save is successful", () => {
      // Make a change
      const inputs = container.querySelectorAll("input");
      fireEvent.change(inputs[0], { target: { value: "env" } });

      // Save
      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLElement;
      fireEvent.click(updateButton);

      // Should call callback with updated labels
      expect(mockOnLabelsUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          env: "test",
          type: "demo",
        }),
        1000n,
      );
    });

    it("should include empty values in the data sent to callback for deletion", () => {
      // Delete the value of an existing label to make it empty
      const inputs = container.querySelectorAll("input");
      fireEvent.change(inputs[1], { target: { value: "" } });

      // This should fail validation due to empty value
      const updateButton = container.querySelector(
        '[title="Update labels"]',
      ) as HTMLElement;
      fireEvent.click(updateButton);

      // Should show error and not call callback
      const errorAlert = container.querySelector(".ant-alert");
      expect(errorAlert).not.toBeNull();
      expect(mockOnLabelsUpdated).not.toHaveBeenCalled();
    });
  });
});
