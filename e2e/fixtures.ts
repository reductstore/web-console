import { test as base, expect } from "@playwright/test";
import { Client, QuotaType } from "reduct-js";

const RS_URL = process.env.RS_URL ?? "http://localhost:8383";
const RS_API_TOKEN = process.env.RS_API_TOKEN ?? "";
const ENTRY = "test-entry";

const client = new Client(RS_URL, {
  apiToken: RS_API_TOKEN || undefined,
});

async function seedData(bucketName: string) {
  for (let i = 0; i < 10; i++) {
    try {
      const bucket = await client.getOrCreateBucket(bucketName, {
        quotaType: QuotaType.NONE,
      });
      const record = await bucket.beginWrite(ENTRY);
      await record.write("hello");
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Failed to seed data after retries");
}

async function cleanUp(bucketName: string) {
  const bucket = await client.getBucket(bucketName);
  await bucket.remove();
}

const test = base.extend<{ seeded: void; BUCKET: string }>({
  BUCKET: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      await use(`e2e-${testInfo.project.name}`);
    },
    { scope: "test" },
  ],
  seeded: [
    async ({ BUCKET }, use) => {
      await seedData(BUCKET);
      await use();
      await cleanUp(BUCKET);
    },
    { auto: true },
  ],
});

export { test, expect, ENTRY, RS_API_TOKEN };
