import { test, expect, ENTRY, RS_API_TOKEN } from "./fixtures";
import { type Page, type Locator } from "@playwright/test";

async function fillMonacoEditor(page: Page, container: Locator, value: string) {
  const editorEl = container.locator(".monaco-editor").first();
  await editorEl.locator(".view-lines").click();

  const dataUri = await editorEl.getAttribute("data-uri");
  await page.evaluate(
    ({ text, uri }) => {
      const m = (window as any).monaco;
      if (!m?.editor?.getModels) return;
      const model = m.editor
        .getModels()
        .find((mod: any) => mod.uri?.toString() === uri);
      if (model) model.setValue(text);
    },
    { text: value, uri: dataUri },
  );

  // Trigger the onChange by clicking the editor and pressing a no-op key
  await editorEl.locator(".view-lines").click();
}

async function login(page: Page) {
  await page.goto("./");
  if (RS_API_TOKEN) {
    await page.getByLabel("API Token").fill(RS_API_TOKEN);
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
}

test.beforeEach(async ({ page, BUCKET }) => {
  await login(page);
  await page.goto(`./buckets/${BUCKET}/entries/${ENTRY}`);
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible({
    timeout: 10_000,
  });
});

test("create and delete an attachment", async ({ page }) => {
  await page.getByRole("button", { name: "Add Attachment" }).click();
  const modal = page.getByRole("dialog", { name: "Add Attachment" });
  await expect(modal).toBeVisible();
  await modal.getByPlaceholder("Name").fill("e2e-att");
  await fillMonacoEditor(page, modal, '{"key": "value"}');
  await modal.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("Attachment saved")).toBeVisible({
    timeout: 10_000,
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("e2e-att")).toBeVisible({ timeout: 10_000 });

  const row = page.locator("tr", { hasText: "e2e-att" });
  const deleteIcon = row.getByTitle("Delete attachment");
  await deleteIcon.waitFor({ state: "visible" });
  await deleteIcon.click();
  const deleteModal = page.getByRole("dialog", { name: "Delete Attachment" });
  await expect(deleteModal).toBeVisible({ timeout: 10_000 });
  await deleteModal.getByRole("button", { name: "Delete" }).click();
  await expect(deleteModal).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("e2e-att")).not.toBeVisible({ timeout: 10_000 });
});
