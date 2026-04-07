import { test as base, expect } from "@playwright/test";
import { Client, QuotaType } from "reduct-js";

const RS_URL = process.env.RS_URL ?? "http://localhost:8383";
const RS_API_TOKEN = process.env.RS_API_TOKEN ?? "";
const BUCKET = "e2e-test";
const ENTRY = "test-entry";

const client = new Client(RS_URL, {
  apiToken: RS_API_TOKEN || undefined,
});

async function seedData() {
  for (let i = 0; i < 10; i++) {
    try {
      const bucket = await client.getOrCreateBucket(BUCKET, {
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

async function cleanUp() {
  const bucket = await client.getBucket(BUCKET);
  await bucket.remove();
}

const test = base.extend<{ seeded: void }>({
  seeded: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await seedData();
      await use();
      await cleanUp();
    },
    { auto: true },
  ],
});

export { test, expect, BUCKET, ENTRY, RS_API_TOKEN };
