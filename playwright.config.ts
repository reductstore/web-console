/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";

const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173/ui/",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: {
      slowMo: Number.isFinite(slowMo) && slowMo > 0 ? slowMo : 0,
    },
  },
  projects: process.env.CI
    ? [
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            permissions: ["clipboard-read", "clipboard-write"],
          },
        },
      ]
    : [
        {
          name: "chromium",
          use: {
            ...devices["Desktop Chrome"],
            permissions: ["clipboard-read", "clipboard-write"],
          },
        },
        {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
        },
        {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
        },
      ],
  webServer: {
    command: "npx vite --port 5173 --strictPort",
    url: "http://localhost:5173/ui/",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_STORAGE_URL: process.env.RS_URL ?? "http://localhost:8383",
      VITE_APP_VERSION: "e2e",
    },
  },
});
