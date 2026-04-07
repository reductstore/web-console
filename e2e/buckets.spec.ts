import { test, expect, ENTRY, RS_API_TOKEN } from "./fixtures";
import { type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("./");
  if (RS_API_TOKEN) {
    await page.getByLabel("API Token").fill(RS_API_TOKEN);
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
}

test("lists buckets and navigates to detail", async ({ page, BUCKET }) => {
  await login(page);
  await page.getByText("Buckets", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Buckets" })).toBeVisible();
  await expect(page.getByText(BUCKET)).toBeVisible();

  await page.getByRole("link", { name: BUCKET }).first().click();
  await expect(page.getByRole("heading", { name: "Entries" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(ENTRY)).toBeVisible();
});

test("navigates to entry detail", async ({ page, BUCKET }) => {
  await login(page);
  await page.goto(`./buckets/${BUCKET}`);
  await expect(page.getByText(ENTRY)).toBeVisible({ timeout: 10_000 });

  await page.getByText(ENTRY).click();
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("Records").first()).toBeVisible();
});
