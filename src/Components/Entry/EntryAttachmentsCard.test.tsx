import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import { message, Button } from "antd";
import { Client } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import EntryAttachmentsCard from "./EntryAttachmentsCard";

jest.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

jest.setTimeout(15000);

const flush = () => new Promise((resolve) => setTimeout(resolve, 100));

describe("EntryAttachmentsCard", () => {
  let wrapper: ReactWrapper;

  const makeBucket = () => ({
    readAttachments: jest.fn().mockResolvedValue({ schema: { version: 1 } }),
    writeAttachments: jest.fn().mockResolvedValue(undefined),
    removeAttachments: jest.fn().mockResolvedValue(undefined),
  });

  let bucket: ReturnType<typeof makeBucket>;
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    message.success = jest.fn() as unknown as typeof message.success;

    bucket = makeBucket();
    client = {
      getBucket: jest.fn().mockResolvedValue(bucket),
    } as unknown as Client;
  });

  afterEach(() => {
    if (wrapper) wrapper.unmount();
  });

  const mountCard = async (editable = true) => {
    await act(async () => {
      wrapper = mount(
        <EntryAttachmentsCard
          client={client}
          bucketName="bucket"
          entryName="entry"
          editable={editable}
        />,
      );
      await flush();
    });
    wrapper.update();
  };

  it("loads and displays attachments in a table", async () => {
    await mountCard();

    expect(client.getBucket).toHaveBeenCalledWith("bucket");
    expect(bucket.readAttachments).toHaveBeenCalledWith("entry");
    expect(wrapper.text()).toContain("schema");
    expect(wrapper.text()).toContain("Attachments");
  });

  it("shows Add Attachment button when editable", async () => {
    await mountCard();

    const addBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Add Attachment"));
    expect(addBtn.length).toBe(1);
  });

  it("hides Add Attachment button when not editable", async () => {
    await mountCard(false);

    const addBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Add Attachment"));
    expect(addBtn.length).toBe(0);
  });

  it("opens add attachment modal when Add Attachment is clicked", async () => {
    await mountCard();

    const addBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Add Attachment"));

    await act(async () => {
      addBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const addModal = wrapper
      .find("Modal")
      .filterWhere((m) => m.prop("title") === "Add Attachment");
    expect(addModal.prop("open")).toBe(true);
  });

  it("saves new attachment via writeAttachments", async () => {
    await mountCard();

    const addBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Add Attachment"));

    await act(async () => {
      addBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const modal = wrapper
      .find("Modal")
      .filterWhere((m) => m.prop("title") === "Add Attachment");
    const keyInput = modal.find("input").first();
    const valueInput = modal.find('[data-testid="monaco-editor"]').first();

    await act(async () => {
      keyInput.simulate("change", { target: { value: "newKey" } });
      valueInput.simulate("change", { target: { value: '{"test": true}' } });
      await flush();
    });
    wrapper.update();

    const saveBtn = modal
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Save"));

    await act(async () => {
      saveBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    expect(bucket.writeAttachments).toHaveBeenCalled();
  });

  it("truncates content preview to 50 characters", async () => {
    const longValue = { data: "a".repeat(100) };
    bucket.readAttachments.mockResolvedValueOnce({ longKey: longValue });
    await mountCard();

    const contentPreview = wrapper.find(".contentPreview").first();
    expect(contentPreview.text().length).toBeLessThanOrEqual(50);
    expect(contentPreview.text()).toContain("...");
  });

  it("has download button for attachments", async () => {
    await mountCard();

    const downloadBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.prop("title") === "Download")
      .first();

    expect(downloadBtn.length).toBe(1);
  });

  it("expands row to show full content", async () => {
    const testValue = { expanded: true, nested: { data: "test" } };
    bucket.readAttachments.mockResolvedValueOnce({ testKey: testValue });
    await mountCard();

    const expandIcon = wrapper.find(".ant-table-row-expand-icon").first();
    await act(async () => {
      expandIcon.simulate("click");
      await flush();
    });
    wrapper.update();

    const expandedRow = wrapper.find(".ant-table-expanded-row");
    expect(expandedRow.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain("expanded");
  });

  it("collapses expanded row on second click", async () => {
    const testValue = { expanded: true, nested: { data: "test".repeat(20) } };
    bucket.readAttachments.mockResolvedValueOnce({ testKey: testValue });
    await mountCard();

    const expandIcon = wrapper.find(".ant-table-row-expand-icon").first();
    await act(async () => {
      expandIcon.simulate("click");
      await flush();
    });
    wrapper.update();

    expect(
      wrapper.find(".ant-table-expanded-row").length,
    ).toBeGreaterThanOrEqual(1);

    await act(async () => {
      wrapper.find(".ant-table-row-expand-icon").first().simulate("click");
      await flush();
    });
    wrapper.update();

    const collapsedIcons = wrapper.find(
      ".ant-table-row-expand-icon.ant-table-row-expand-icon-collapsed",
    );
    expect(collapsedIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("opens edit mode via action icon when editable", async () => {
    await mountCard();

    const editBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.prop("title") === "Edit")
      .first();

    await act(async () => {
      editBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const keyInput = wrapper
      .find("input")
      .filterWhere((inp) => inp.prop("value") === "schema");
    expect(keyInput.length).toBe(1);
  });

  it("does not show edit action icon when not editable", async () => {
    await mountCard(false);

    const editBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.prop("title") === "Edit");
    expect(editBtn.length).toBe(0);
  });

  it("saves edited attachment via writeAttachments", async () => {
    await mountCard();

    const editBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.prop("title") === "Edit")
      .first();

    await act(async () => {
      editBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const keyInput = wrapper.find(".expandedEditRow input").first();
    const valueInput = wrapper
      .find('.expandedEditRow [data-testid="monaco-editor"]')
      .first();

    await act(async () => {
      keyInput.simulate("change", { target: { value: "newSchema" } });
      valueInput.simulate("change", {
        target: { value: '{"version": 2}' },
      });
      await flush();
    });
    wrapper.update();

    const saveBtn = wrapper
      .find(".expandedEditRow")
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Save"))
      .first();

    await act(async () => {
      saveBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    expect(bucket.removeAttachments).toHaveBeenCalledWith("entry", ["schema"]);
    expect(bucket.writeAttachments).toHaveBeenCalled();
  });

  it("closes expanded row on close button click", async () => {
    await mountCard();

    const editBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.prop("title") === "Edit")
      .first();

    await act(async () => {
      editBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const closeBtn = wrapper
      .find(".expandedEditRow")
      .find(Button)
      .filterWhere((btn) => btn.text().includes("Close"))
      .first();

    await act(async () => {
      closeBtn.simulate("click");
      await flush();
    });
    wrapper.update();
    await act(async () => {
      await flush();
    });
    wrapper.update();

    expect(bucket.writeAttachments).not.toHaveBeenCalled();
  });

  it("has sortable key column", async () => {
    await mountCard();

    const sorterIcon = wrapper.find(".ant-table-column-sorter");
    expect(sorterIcon.length).toBeGreaterThan(0);
  });

  it("has search filter on key column", async () => {
    await mountCard();

    const filterIcon = wrapper.find(".filterIcon");
    expect(filterIcon.length).toBeGreaterThan(0);
  });

  it("opens delete confirmation modal on delete click", async () => {
    await mountCard();

    const deleteBtn = wrapper
      .find(Button)
      .filterWhere((btn) => btn.find(".deleteIcon").length > 0)
      .first();

    await act(async () => {
      deleteBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const deleteModal = wrapper
      .find("Modal")
      .filterWhere((m) => m.prop("title") === "Delete Attachment");
    expect(deleteModal.prop("open")).toBe(true);
  });

  it("removes attachment on delete confirm", async () => {
    await mountCard();

    const deleteBtn = wrapper.find(".actionIcon.deleteIcon").first();

    await act(async () => {
      deleteBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    const confirmBtn = wrapper
      .find(Button)
      .filterWhere((btn) =>
        Boolean(btn.text() === "Delete" && btn.prop("danger")),
      );

    await act(async () => {
      confirmBtn.simulate("click");
      await flush();
    });
    wrapper.update();

    expect(bucket.removeAttachments).toHaveBeenCalledWith("entry", ["schema"]);
  });
});
