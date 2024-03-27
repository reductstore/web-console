import React from "react";
import {mount} from "enzyme";
import UsageStatistics from "./UsageStatistics";
import {ServerInfo, BucketInfo} from "reduct-js";
import {mockJSDOM} from "../../Helpers/TestHelpers";

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
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
  });

  it("should display the correct usage", () => {
    const wrapper = mount(<UsageStatistics info={serverInfo} buckets={buckets} />);
    expect(wrapper.find({title: "Usage"}).find("Statistic").prop("value")).toEqual("50 GB");
  });

  it("should display the correct number of buckets", () => {
    const wrapper = mount(<UsageStatistics info={serverInfo} buckets={buckets} />);
    expect(wrapper.find({title: "Buckets"}).find("Statistic").prop("value")).toEqual(buckets.length);
  });

  it("should display the correct uptime", () => {
    const wrapper = mount(<UsageStatistics info={serverInfo} buckets={buckets} />);
    expect(wrapper.find({title: "Uptime"}).find("Statistic").prop("value")).toEqual("1 day");
  });
});
