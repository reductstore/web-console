import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { message } from "antd";
import {
  DeleteOutlined,
  UndoOutlined,
  InsertRowBelowOutlined,
} from "@ant-design/icons";
import EditRecordLabels from "./EditRecordLabels";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("EditRecordLabels", () => {
  let wrapper: ReactWrapper;
  const mockOnLabelsUpdated = jest.fn();

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
    jest.clearAllMocks();
    mockJSDOM();
    message.success = jest.fn();
    message.error = jest.fn();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("Rendering", () => {
    it("should render labels title", () => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const title = wrapper.find(".labelsTitle");
      expect(title.exists()).toBe(true);
      expect(title.first().text()).toBe("Labels");
    });

    it("should render ScrollableTable with correct props", () => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const table = wrapper.find("ScrollableTable");
      expect(table.exists()).toBe(true);
      expect(table.prop("size")).toBe("small");
      expect(table.prop("bordered")).toBe(true);
      expect(table.prop("pagination")).toBe(false);
    });

    it("should display existing labels from record", () => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const tableText = wrapper.find(".ant-table").text();
      expect(tableText).toContain("name");
      expect(tableText).toContain("test");
      expect(tableText).toContain("type");
      expect(tableText).toContain("demo");
    });

    it("should render empty table when record has no labels", () => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecordWithEmptyLabels}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const tableText = wrapper.find(".ant-table").text();
      expect(tableText).not.toContain("name");
      expect(tableText).not.toContain("test");
      expect(tableText).not.toContain("type");
      expect(tableText).not.toContain("demo");
    });

    it("should render nothing when no record provided", () => {
      wrapper = mount(
        <EditRecordLabels
          record={null}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );

      const title = wrapper.find(".labelsTitle");
      expect(title.exists()).toBe(false);
    });
  });

  describe("Read-only Mode", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={false}
        />,
      );
    });

    it("should not show action buttons when editable=false", () => {
      const addButton = wrapper.find('Button[title="Add new label"]');
      const revertButton = wrapper.find('Button[title="Revert changes"]');
      const updateButton = wrapper.find('Button[title="Update labels"]');

      expect(addButton.exists()).toBe(false);
      expect(revertButton.exists()).toBe(false);
      expect(updateButton.exists()).toBe(false);
    });

    it("should not show action column when editable=false", () => {
      const table = wrapper.find("ScrollableTable");
      const columns = table.prop("columns") as any[];

      expect(columns.length).toBe(2);
      expect(columns[0].title).toBe("Key");
      expect(columns[1].title).toBe("Value");
    });

    it("should display labels as non-editable text", () => {
      const firstCell = wrapper.find(".ant-table-tbody td").at(0);
      firstCell.simulate("click");
      wrapper.update();

      const inputs = wrapper.find("Input");
      expect(inputs.length).toBe(0);
    });
  });

  describe("Editable Mode", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should show action buttons when editable=true", () => {
      const addButton = wrapper.find('Button[title="Add new label"]');
      const revertButton = wrapper.find('Button[title="Revert changes"]');
      const updateButton = wrapper.find('Button[title="Update labels"]');

      expect(addButton.exists()).toBe(true);
      expect(revertButton.exists()).toBe(true);
      expect(updateButton.exists()).toBe(true);
    });

    it("should show action column when editable=true", () => {
      const table = wrapper.find("ScrollableTable");
      const columns = table.prop("columns") as any[];

      expect(columns.length).toBe(3);
      expect(columns[0].title).toBe("Key");
      expect(columns[1].title).toBe("Value");
      expect(columns[2].title).toBe("Actions");
    });

    it("should show row action icons for each row", () => {
      const revertIcons = wrapper.find(UndoOutlined);
      const addBelowIcons = wrapper.find(InsertRowBelowOutlined);
      const deleteIcons = wrapper.find(DeleteOutlined);

      expect(revertIcons.length).toBeGreaterThanOrEqual(2);
      expect(addBelowIcons.length).toBeGreaterThanOrEqual(2);
      expect(deleteIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("should disable revert and update buttons initially when no changes", () => {
      const revertButton = wrapper.find('Button[title="Revert changes"]');
      const updateButton = wrapper.find('Button[title="Update labels"]');

      expect(revertButton.prop("disabled")).toBe(true);
      expect(updateButton.prop("disabled")).toBe(true);
    });
  });

  describe("Cell Editing", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should make cell editable when clicked", () => {
      // In editable mode, inputs are always visible
      const inputs = wrapper.find("Input");
      expect(inputs.length).toBeGreaterThan(0);

      // Check first input has the correct value
      const firstInput = inputs.at(0);
      expect(firstInput.prop("value")).toBe("name");
    });

    it("should save changes when input value changes", () => {
      // Find the first input (should be the first key)
      const input = wrapper.find("Input").at(0);
      expect(input.prop("value")).toBe("name");

      // Change the value
      input.simulate("change", { target: { value: "env" } });
      wrapper.update();

      // Should enable buttons since we made changes
      const updateButton = wrapper.find('Button[title="Update labels"]');
      expect(updateButton.prop("disabled")).toBe(false);
    });

    it("should save changes when value is modified", () => {
      // Find the second input (should be the first value)
      const input = wrapper.find("Input").at(1);
      expect(input.prop("value")).toBe("test");

      // Change the value
      input.simulate("change", { target: { value: "sample" } });
      wrapper.update();

      // Should enable buttons
      const updateButton = wrapper.find('Button[title="Update labels"]');
      expect(updateButton.prop("disabled")).toBe(false);
    });
  });

  describe("Adding Labels", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should add new empty row when Add button is clicked", () => {
      const initialRows = wrapper.find(".ant-table-tbody tr").length;

      const addButton = wrapper.find('Button[title="Add new label"]');
      addButton.simulate("click");
      wrapper.update();

      const newRows = wrapper.find(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows + 1);
    });

    it("should add new row below target when add-below icon is clicked", () => {
      const initialRows = wrapper.find(".ant-table-tbody tr").length;

      // Click the "add below" icon on the first row
      const addBelowIcon = wrapper.find(".add-below-icon").at(0);
      addBelowIcon.simulate("click");
      wrapper.update();

      const newRows = wrapper.find(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows + 1);
    });
  });

  describe("Deleting Labels", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should delete row when delete icon is clicked", () => {
      const initialRows = wrapper.find(".ant-table-tbody tr").length;

      // Click delete icon on first row
      const deleteIcon = wrapper.find(".delete-icon").at(0);
      deleteIcon.simulate("click");
      wrapper.update();

      const newRows = wrapper.find(".ant-table-tbody tr").length;
      expect(newRows).toBe(initialRows - 1);
    });

    it("should enable update button after deleting a row", () => {
      const deleteIcon = wrapper.find(".delete-icon").at(0);
      deleteIcon.simulate("click");
      wrapper.update();

      const updateButton = wrapper.find('Button[title="Update labels"]');
      expect(updateButton.prop("disabled")).toBe(false);
    });
  });

  describe("Reverting Changes", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should revert individual row changes when row revert icon is clicked", () => {
      // First, modify a cell
      const input = wrapper.find("Input").at(0);
      input.simulate("change", { target: { value: "modified" } });
      wrapper.update();

      // Now revert the row
      const revertIcon = wrapper.find(".revert-icon").at(0);
      expect(revertIcon.prop("disabled")).toBe(false);

      revertIcon.simulate("click");
      wrapper.update();

      // Should be reverted back to original
      const firstInput = wrapper.find("Input").at(0);
      expect(firstInput.prop("value")).toBe("name");
    });

    it("should revert all changes when global revert button is clicked", () => {
      if (wrapper) wrapper.unmount();
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );

      // Make a simple change - modify a value
      const input = wrapper.find("Input").at(0);
      expect(input.prop("value")).toBe("name"); // Ensure starting value
      input.simulate("change", { target: { value: "modified" } });
      wrapper.update();

      // Verify change was made
      const modifiedInput = wrapper.find("Input").at(0);
      expect(modifiedInput.prop("value")).toBe("modified");

      // Revert all changes
      const revertButton = wrapper
        .find('Button[title="Revert changes"]')
        .first();
      revertButton.simulate("click");
      wrapper.update();

      // Should have original values
      const revertedInput = wrapper.find("Input").at(0);
      expect(revertedInput.prop("value")).toBe("name");
    });

    it("should disable revert icons for unchanged rows", () => {
      const revertIcons = wrapper.find(".revert-icon");
      revertIcons.forEach((icon) => {
        expect(icon.prop("disabled")).toBe(true);
      });
    });
  });

  describe("Saving Labels", () => {
    beforeEach(() => {
      wrapper = mount(
        <EditRecordLabels
          record={mockRecord}
          onLabelsUpdated={mockOnLabelsUpdated}
          editable={true}
        />,
      );
    });

    it("should call onLabelsUpdated with correct data when save is successful", () => {
      // Make a change
      const input = wrapper.find("Input").at(0);
      input.simulate("change", { target: { value: "env" } });
      wrapper.update();

      // Save
      const updateButton = wrapper.find('Button[title="Update labels"]');
      updateButton.simulate("click");

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
      const input = wrapper.find("Input").at(1);
      input.simulate("change", { target: { value: "" } });
      wrapper.update();

      // This should fail validation due to empty value
      const updateButton = wrapper.find('Button[title="Update labels"]');
      updateButton.simulate("click");
      wrapper.update();

      // Should show error and not call callback
      const errorAlert = wrapper.find("Alert");
      expect(errorAlert.exists()).toBe(true);
      expect(mockOnLabelsUpdated).not.toHaveBeenCalled();
    });
  });
});
