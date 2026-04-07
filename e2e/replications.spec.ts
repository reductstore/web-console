import { test, expect, RS_API_TOKEN } from "./fixtures";
import { type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("./");
  if (RS_API_TOKEN) {
    await page.getByLabel("API Token").fill(RS_API_TOKEN);
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByText("Dashboard")).toBeVisible({ timeout: 10_000 });
}

test("shows replications page", async ({ page }) => {
  await login(page);
  await page.getByText("Replications", { exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Replications" })).toBeVisible(
    { timeout: 10_000 },
  );
});
