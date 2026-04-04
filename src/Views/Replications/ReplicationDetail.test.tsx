import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";

import { Client, ReplicationInfo, ReplicationSettings } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import ReplicationDetail from "./ReplicationDetail";
import { Diagnostics } from "reduct-js/lib/cjs/messages/Diagnostics";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("ReplicationDetail", () => {
  const client = new Client("dummyURL");
  let container: HTMLElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockJSDOM();

    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
    });

    const mockReplicationSettings = ReplicationSettings.parse({
      src_bucket: "sourceBucket",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
    });

    const mockDiagnostics = Diagnostics.parse({
      hourly: {
        ok: BigInt(1000),
        errored: BigInt(5),
        errors: {
          0: {
            count: 5,
            last_message: "Error connecting to source bucket",
          },
          1: {
            count: 10,
            last_message: "Error connecting to destination bucket",
          },
        },
      },
    });

    client.getReplication = vi.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockReplicationSettings,
      diagnostics: mockDiagnostics,
    });

    const mockBucketList = [
      { name: "Bucket1", creationDate: "2021-01-01" },
      { name: "Bucket2", creationDate: "2021-06-01" },
    ];

    client.getBucketList = vi.fn().mockResolvedValue(mockBucketList);

    await act(async () => {
      const result = render(
        <MemoryRouter>
          <ReplicationDetail client={client} />
        </MemoryRouter>,
      );
      ({ container } = result);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("fetches replication and bucket data on mount and at intervals", async () => {
    expect(client.getReplication).toHaveBeenCalledTimes(1);
    expect(client.getBucketList).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(client.getReplication).toHaveBeenCalledTimes(2);
    expect(client.getBucketList).toHaveBeenCalledTimes(2);
  });

  it("displays replication card", async () => {
    expect(screen.getByText("TestReplication")).toBeTruthy();
  });

  it("displays replication card with correct props", async () => {
    expect(screen.getByText("TestReplication")).toBeTruthy();
    expect(screen.getByText("100")).toBeTruthy();
    expect(screen.getByText("1,000")).toBeTruthy();
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Records Awaiting Replication")).toBeTruthy();
    expect(
      screen.getByText("Successfully Replicated (Past Hour)"),
    ).toBeTruthy();
    expect(screen.getByText("Errors (Past Hour)")).toBeTruthy();
  });

  it("displays replication errors", async () => {
    const table = container.querySelector(".ant-table");
    expect(table).toBeTruthy();

    expect(screen.getByText("Error connecting to source bucket")).toBeTruthy();
    expect(
      screen.getByText("Error connecting to destination bucket"),
    ).toBeTruthy();

    const rows = container.querySelectorAll(".ant-table-tbody tr");
    expect(rows.length).toBe(2);
  });
});
