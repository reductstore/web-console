import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { message } from "antd";
import { Client } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import EntryAttachmentsCard from "./EntryAttachmentsCard";

// Mock ResizeObserver for antd Table
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("@monaco-editor/react", () => ({
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

vi.setConfig({ testTimeout: 15000 });

describe("EntryAttachmentsCard", () => {
  let container: HTMLElement;

  const makeBucket = () => ({
    readAttachments: vi.fn().mockResolvedValue({ schema: { version: 1 } }),
    writeAttachments: vi.fn().mockResolvedValue(undefined),
    removeAttachments: vi.fn().mockResolvedValue(undefined),
  });

  let bucket: ReturnType<typeof makeBucket>;
  let client: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    message.success = vi.fn() as unknown as typeof message.success;

    bucket = makeBucket();
    client = {
      getBucket: vi.fn().mockResolvedValue(bucket),
    } as unknown as Client;
  });

  const mountCard = async (editable = true) => {
    const result = render(
      <EntryAttachmentsCard
        client={client}
        bucketName="bucket"
        entryName="entry"
        editable={editable}
      />,
    );
    ({ container } = result);
    await waitFor(() => {
      expect(bucket.readAttachments).toHaveBeenCalled();
    });
  };

  it("loads and displays attachments in a table", async () => {
    await mountCard();

    expect(client.getBucket).toHaveBeenCalledWith("bucket");
    expect(bucket.readAttachments).toHaveBeenCalledWith("entry");
    expect(container.textContent).toContain("schema");
    expect(container.textContent).toContain("Attachments");
  });

  it("shows Add Attachment button when editable", async () => {
    await mountCard();

    const addBtn = screen.getByRole("button", { name: /Add Attachment/ });
    expect(addBtn).toBeTruthy();
  });

  it("hides Add Attachment button when not editable", async () => {
    await mountCard(false);

    const addBtns = screen.queryAllByRole("button", {
      name: /Add Attachment/,
    });
    expect(addBtns.length).toBe(0);
  });

  it("shows 'No attachments' message when not editable and no attachments", async () => {
    bucket.readAttachments.mockResolvedValue({});
    await mountCard(false);

    await waitFor(() => {
      expect(container.textContent).toContain("No attachments");
    });
  });

  it("does not show 'No attachments' message when editable", async () => {
    bucket.readAttachments.mockResolvedValue({});
    await mountCard(true);

    expect(container.textContent).not.toContain("No attachments");
  });

  it("opens add attachment modal when Add Attachment is clicked", async () => {
    await mountCard();

    const addBtn = screen.getByRole("button", { name: /Add Attachment/ });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Add Attachment", { selector: ".ant-modal-title" }),
      ).toBeTruthy();
    });
  });

  it("saves new attachment via writeAttachments", async () => {
    await mountCard();

    const addBtn = screen.getByRole("button", { name: /Add Attachment/ });
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(document.querySelector(".ant-modal")).toBeTruthy();
    });

    const modal = document.querySelector(".ant-modal") as HTMLElement;
    const keyInput = modal.querySelector("input") as HTMLInputElement;
    const valueInput = modal.querySelector(
      '[data-testid="monaco-editor"]',
    ) as HTMLTextAreaElement;

    fireEvent.change(keyInput, { target: { value: "newKey" } });
    fireEvent.change(valueInput, { target: { value: '{"test": true}' } });

    const saveBtn = Array.from(modal.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Save"),
    ) as HTMLElement;

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(bucket.writeAttachments).toHaveBeenCalled();
    });
  });

  it("truncates content preview to 50 characters", async () => {
    const longValue = { data: "a".repeat(100) };
    bucket.readAttachments.mockResolvedValueOnce({ longKey: longValue });
    await mountCard();

    await waitFor(() => {
      const contentPreview = container.querySelector(
        ".contentPreview",
      ) as HTMLElement;
      expect(contentPreview).toBeTruthy();
      expect(contentPreview.textContent!.length).toBeLessThanOrEqual(50);
      expect(contentPreview.textContent).toContain("...");
    });
  });

  it("has download button for attachments", async () => {
    await mountCard();

    await waitFor(() => {
      expect(screen.getAllByTitle("Download").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("expands row to show full content", async () => {
    const testValue = { expanded: true, nested: { data: "test" } };
    bucket.readAttachments.mockResolvedValueOnce({ testKey: testValue });
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    const expandIcon = container.querySelector(
      ".ant-table-row-expand-icon",
    ) as HTMLElement;
    fireEvent.click(expandIcon);

    await waitFor(() => {
      expect(container.querySelector(".ant-table-expanded-row")).toBeTruthy();
      expect(container.textContent).toContain("expanded");
    });
  });

  it("collapses expanded row on second click", async () => {
    const testValue = { expanded: true, nested: { data: "test".repeat(20) } };
    bucket.readAttachments.mockResolvedValueOnce({ testKey: testValue });
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      expect(container.querySelector(".ant-table-expanded-row")).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      const collapsedIcons = container.querySelectorAll(
        ".ant-table-row-expand-icon.ant-table-row-expand-icon-collapsed",
      );
      expect(collapsedIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("saves edited attachment via writeAttachments", async () => {
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      expect(container.querySelector(".expandedEditRow")).toBeTruthy();
    });

    const editRow = container.querySelector(".expandedEditRow") as HTMLElement;
    const keyInput = editRow.querySelector("input") as HTMLInputElement;
    const valueInput = editRow.querySelector(
      '[data-testid="monaco-editor"]',
    ) as HTMLTextAreaElement;

    fireEvent.change(keyInput, { target: { value: "newSchema" } });
    fireEvent.change(valueInput, {
      target: { value: '{"version": 2}' },
    });

    const saveBtn = Array.from(editRow.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Save"),
    ) as HTMLElement;

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(bucket.removeAttachments).toHaveBeenCalledWith("entry", [
        "schema",
      ]);
      expect(bucket.writeAttachments).toHaveBeenCalled();
    });
  });

  it("expands an existing attachment editor into a modal", async () => {
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Expand editor/ }),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Expand editor/ }));

    await waitFor(() => {
      expect(container.textContent).toContain(
        "Editing in expanded attachment editor",
      );
      expect(
        screen.getByText("Attachment Editor: schema", {
          selector: ".ant-modal-title",
        }),
      ).toBeTruthy();
    });
  });

  it("shows format and expand actions without a copy action", async () => {
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      expect(
        screen.queryAllByRole("button", { name: /Format JSON/ }),
      ).toHaveLength(1);
      expect(
        screen.queryAllByRole("button", { name: /Expand editor/ }),
      ).toHaveLength(1);
      expect(screen.queryAllByRole("button", { name: /Copy/ })).toHaveLength(0);
    });
  });

  it("keeps cancel hidden until there are unsaved changes", async () => {
    await mountCard();

    await waitFor(() => {
      expect(
        container.querySelector(".ant-table-row-expand-icon"),
      ).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".ant-table-row-expand-icon") as HTMLElement,
    );

    await waitFor(() => {
      expect(container.querySelector(".expandedEditRow")).toBeTruthy();
    });

    const editRow = container.querySelector(".expandedEditRow") as HTMLElement;
    const cancelBtn = Array.from(editRow.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Cancel"),
    ) as HTMLElement;

    expect(cancelBtn).toBeTruthy();
    expect(cancelBtn.classList.contains("hidden")).toBe(true);
    expect(cancelBtn.hasAttribute("disabled")).toBe(true);
    expect(bucket.writeAttachments).not.toHaveBeenCalled();
  });

  it("has sortable key column", async () => {
    await mountCard();

    await waitFor(() => {
      expect(container.querySelector(".ant-table-column-sorter")).toBeTruthy();
    });
  });

  it("has search filter on key column", async () => {
    await mountCard();

    await waitFor(() => {
      expect(container.querySelector(".filterIcon")).toBeTruthy();
    });
  });

  it("opens delete confirmation modal on delete click", async () => {
    await mountCard();

    await waitFor(() => {
      expect(container.querySelector(".actionIcon.deleteIcon")).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".actionIcon.deleteIcon") as HTMLElement,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Delete Attachment", {
          selector: ".ant-modal-title",
        }),
      ).toBeTruthy();
    });
  });

  it("removes attachment on delete confirm", async () => {
    await mountCard();

    await waitFor(() => {
      expect(container.querySelector(".actionIcon.deleteIcon")).toBeTruthy();
    });

    fireEvent.click(
      container.querySelector(".actionIcon.deleteIcon") as HTMLElement,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Delete Attachment", {
          selector: ".ant-modal-title",
        }),
      ).toBeTruthy();
    });

    const confirmBtn = Array.from(document.querySelectorAll("button")).find(
      (btn) =>
        btn.textContent === "Delete" &&
        btn.classList.contains("ant-btn-dangerous"),
    ) as HTMLElement;

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(bucket.removeAttachments).toHaveBeenCalledWith("entry", [
        "schema",
      ]);
    });
  });
});
