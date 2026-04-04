import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";

import Dashboard from "./Dashboard";
import { Client, ServerInfo } from "reduct-js";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// antd components use ResizeObserver
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("Dashboard", () => {
  const client = new Client("");
  const backend = {
    get client() {
      return client;
    },
    login: vi.fn(),
    logout: vi.fn(),
    isAllowed: vi.fn(),
    me: vi.fn(),
  };

  const serverInfo: ServerInfo = {
    version: "0.4.0",
    uptime: 1000n, // 16 minutes
    usage: 2000n,
    bucketCount: 2n,
    oldestRecord: 10n,
    latestRecord: 10000010n,
    defaults: {
      bucket: {},
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getInfo = vi.fn().mockResolvedValue(serverInfo);
    client.getBucketList = vi.fn().mockResolvedValue([
      {
        name: "bucket_1",
        entryCount: 2,
        size: 1000n,
        oldestRecord: 10n,
        latestRecord: 10000010n,
      },
      {
        name: "bucket_2",
        entryCount: 2,
        size: 1000n,
        oldestRecord: 10n,
        latestRecord: 10000030n,
      },
    ]);
  });

  it("should show server info by default", async () => {
    client.getInfo = vi.fn().mockResolvedValue(serverInfo);
    client.getBucketList = vi.fn().mockResolvedValue([]);

    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelector("#ServerInfo")).toBeTruthy(),
    );
    const html = container.querySelector("#ServerInfo")!;

    expect(html.textContent).toContain("0.4.0");
    expect(html.textContent).toContain("16 minutes");
    expect(html.textContent).toContain("2 KB");
  });

  it("should show license info when clicked on the tab", async () => {
    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelector(".ant-tabs-tab-btn")).toBeTruthy(),
    );
    const tabs = container.querySelectorAll(".ant-tabs-tab-btn");
    fireEvent.click(tabs[1]);

    await waitFor(() =>
      expect(container.textContent).toContain("Apache License 2.0"),
    );
  });

  it("should show bucket info", async () => {
    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelector("#bucket_1")).toBeTruthy(),
    );
    const bucket = container.querySelector("#bucket_1")!;
    expect(bucket.textContent).toContain("bucket_1");
    expect(bucket.textContent).toContain("1 KB");
    expect(bucket.textContent).toContain("10 seconds");
  });

  it("should order buckets by last records", async () => {
    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelector("#bucket_1")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(container.querySelector("#bucket_2")).toBeTruthy(),
    );

    // bucket_2 has a later latestRecord, so it should appear first
    const bucketCards = container.querySelectorAll("[id^='bucket_']");
    expect(bucketCards[0].id).toEqual("bucket_2");
    expect(bucketCards[1].id).toEqual("bucket_1");
  });

  it("should push to BucketDetail if user click on bucket card", async () => {
    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelector("#bucket_1")).toBeTruthy(),
    );
    const bucket = container.querySelector("#bucket_1")!;
    fireEvent.click(bucket);

    expect(mockNavigate).toBeCalledWith("/buckets/bucket_1");
  });

  it("shows warning icon if license is invalid", async () => {
    client.getInfo = vi.fn().mockResolvedValue({
      ...serverInfo,
      license: {
        licensee: "test",
        plan: "free",
        invoice: "123",
        deviceNumber: "123",
        expiryDate: Date.now() - 1000,
        diskQuota: 1,
        fingerprint: "123",
      },
    });

    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await waitFor(() =>
      expect(container.querySelectorAll(".warningIcon").length).toBe(1),
    );
  });

  it("does not show warning icon if license is valid", async () => {
    client.getInfo = vi.fn().mockResolvedValue({
      ...serverInfo,
      license: {
        licensee: "test",
        plan: "free",
        invoice: "123",
        deviceNumber: "123",
        expiryDate: Date.now() + 1000,
        diskQuota: 1,
        fingerprint: "123",
      },
    });

    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    // Wait for async data to load
    await waitFor(() =>
      expect(container.querySelector("#ServerInfo")).toBeTruthy(),
    );
    expect(container.querySelectorAll(".warningIcon")).toHaveLength(0);
  });

  it("shows correct usage and bucket count even if bucket list is filtered", async () => {
    client.getInfo = vi.fn().mockResolvedValue({
      ...serverInfo,
      bucketCount: 5n,
      usage: 1000n * 1000n * 1000n * 50n, // 50 GB
    });

    client.getBucketList = vi.fn().mockResolvedValue([
      {
        name: "bucket_visible",
        entryCount: 2,
        size: 1000n,
        oldestRecord: 10n,
        latestRecord: 10000010n,
      },
    ]);

    const { container } = render(
      <Dashboard backendApi={backend} permissions={{ fullAccess: false }} />,
    );

    await waitFor(() =>
      expect(container.querySelector("#ServerInfo")).toBeTruthy(),
    );
    const serverInfoPanel = container.querySelector("#ServerInfo")!;
    expect(serverInfoPanel.textContent).toContain("50 GB");
    expect(serverInfoPanel.textContent).toContain("5");

    await waitFor(() =>
      expect(container.querySelector("#bucket_visible")).toBeTruthy(),
    );
    const bucket = container.querySelector("#bucket_visible")!;
    expect(bucket.textContent).toContain("bucket_visible");
  });
});
