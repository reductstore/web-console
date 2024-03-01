import React from "react";
import {ReactWrapper, mount} from "enzyme";
import {MemoryRouter} from "react-router-dom";

import {Client, ReplicationInfo, ReplicationSettings} from "reduct-js";
import {mockJSDOM} from "../../Helpers/TestHelpers";
import ReplicationDetail from "./ReplicationDetail";
import {Diagnostics} from "reduct-js/lib/cjs/messages/Diagnostics";

describe("ReplicationDetail", () => {
  const client = new Client("dummyURL");
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockJSDOM();


    const mockReplicationInfo = ReplicationInfo.parse(
      {
        name: "TestReplication",
        is_active: true,
        is_provisioned: true,
        pending_records: BigInt(100),
      }
    );

    const mockReplicationSettings = ReplicationSettings.parse(
      {
        src_bucket: "sourceBucket",
        dst_bucket: "destinationBucket",
        dst_host: "destinationHost",
        dst_token: "destinationToken",
        entries: ["entry1", "entry2"],
        include: {"label1": "value1"},
        exclude: {"label2": "value2"},
      }
    );

    const mockDiagnostics = Diagnostics.parse(
      {
        hourly: {
          ok: BigInt(1000),
          errored: BigInt(5),
          errors: {
            0: {
              count: 5,
              last_message: "Error connecting to source bucket"
            },
            1: {
              count: 10,
              last_message: "Error connecting to destination bucket"
            },
          },
        },
      }
    );

    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockReplicationSettings,
      diagnostics: mockDiagnostics,
    });

    const mockBucketList = [
      {name: "Bucket1", creationDate: "2021-01-01"},
      {name: "Bucket2", creationDate: "2021-06-01"},
    ];

    client.getBucketList = jest.fn().mockResolvedValue(mockBucketList);

    wrapper = mount(
      <MemoryRouter>
        <ReplicationDetail client={client} />
      </MemoryRouter>
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("fetches replication and bucket data on mount and at intervals", () => {
    expect(client.getReplication).toHaveBeenCalledTimes(1);
    expect(client.getBucketList).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5000);

    expect(client.getReplication).toHaveBeenCalledTimes(2);
    expect(client.getBucketList).toHaveBeenCalledTimes(2);
  });

  it("displays replication card", async () => {
    await wrapper.update();
    const replicationCard = wrapper.find("ReplicationCard");
    expect(replicationCard.exists()).toBeTruthy();
  });

  it("displays replication card with correct props", async () => {
    await wrapper.update();
    const replicationCard = wrapper.find("ReplicationCard");
    expect(replicationCard.prop("replication")).toMatchObject({
      info: {
        name: "TestReplication",
        isActive: true,
        isProvisioned: true,
        pendingRecords: BigInt(100),
      },
      settings: {
        srcBucket: "sourceBucket",
        dstBucket: "destinationBucket",
        dstHost: "destinationHost",
        dstToken: "destinationToken",
        entries: ["entry1", "entry2"],
        include: {"label1": "value1"},
        exclude: {"label2": "value2"},
      },
      diagnostics: {
        hourly: {
          ok: BigInt(1000),
          errored: BigInt(5),
          errors: {
            0: {
              count: 5,
              lastMessage: "Error connecting to source bucket"
            },
            1: {
              count: 10,
              lastMessage: "Error connecting to destination bucket"
            },
          },
        },
      },
    });

    expect(replicationCard.prop("sourceBuckets")).toEqual(["Bucket1", "Bucket2"]);
  });

  it("displays replication errors", async () => {
    await wrapper.update();
    const replicationErrors = wrapper.find("Table");
    expect(replicationErrors.exists()).toBeTruthy();
    expect(replicationErrors.prop("dataSource")).toEqual([
      {key: "error-0", code: "0", count: "5", lastMessage: "Error connecting to source bucket"},
      {key: "error-1", code: "1", count: "10", lastMessage: "Error connecting to destination bucket"},
    ]);
  });
});
