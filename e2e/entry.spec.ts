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

test.beforeEach(async ({ page, BUCKET }) => {
  await login(page);
  await page.goto(`./buckets/${BUCKET}/entries/${ENTRY}`);
  await expect(page.getByRole("heading", { name: "Attachments" })).toBeVisible({
    timeout: 10_000,
  });
});

test("shows entry stats", async ({ page }) => {
  await expect(page.getByText("Size").first()).toBeVisible();
  await expect(page.getByText("Records").first()).toBeVisible();
  await expect(page.getByText("History").first()).toBeVisible();
});

test("fetches records", async ({ page }) => {
  await page.getByRole("button", { name: "Fetch Records" }).click();
  await expect(page.getByText("Timestamp")).toBeVisible({ timeout: 10_000 });
});
