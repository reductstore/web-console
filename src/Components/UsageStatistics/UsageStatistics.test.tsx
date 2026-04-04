import React from "react";
import { render, screen } from "@testing-library/react";
import UsageStatistics from "./UsageStatistics";
import { ServerInfo, BucketInfo, Status } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("UsageStatistics", () => {
  const serverInfo: ServerInfo = {
    version: "1.0.0",
    bucketCount: 5n,
    usage: 1000n * 1000n * 1000n * 50n, // 50 GB
    uptime: 97320n, // 1 day, 3 hours, 2 minutes in seconds
    oldestRecord: 0n,
    latestRecord: 0n,
    defaults: {
      bucket: {},
    },
  };

  const buckets: BucketInfo[] = new Array(5).fill(null).map((_, index) => ({
    name: `bucket-${index}`,
    entryCount: 100n,
    size: 1000n * 1000n * 1000n * 10n, // 10 GB
    oldestRecord: 0n,
    latestRecord: 0n,
    status: Status.READY,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
  });

  it("should display the correct usage", () => {
    render(<UsageStatistics info={serverInfo} />);
    expect(screen.getByText("Usage")).toBeInTheDocument();
    expect(screen.getByText("50 GB")).toBeInTheDocument();
  });

  it("should display the correct number of buckets", () => {
    render(<UsageStatistics info={serverInfo} />);
    expect(screen.getByText("Buckets")).toBeInTheDocument();
    expect(screen.getByText(buckets.length.toString())).toBeInTheDocument();
  });

  it("should display the correct uptime", () => {
    render(<UsageStatistics info={serverInfo} />);
    expect(screen.getByText("Uptime")).toBeInTheDocument();
    expect(screen.getByText("1 day")).toBeInTheDocument();
  });
});
