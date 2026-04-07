import { test, expect, BUCKET, RS_API_TOKEN } from "./fixtures";
import { type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("./");
  if (RS_API_TOKEN) {
    await page.getByLabel("API Token").fill(RS_API_TOKEN);
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
}

test("shows server info and buckets", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Server")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buckets" })).toBeVisible();
  await expect(page.locator("#ServerInfo").getByText("Uptime")).toBeVisible();
  await expect(page.getByText(BUCKET)).toBeVisible();
});
