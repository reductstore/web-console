import React from "react";
import {mount, ReactWrapper} from "enzyme";
import {act} from "react-dom/test-utils";
import {Card} from "antd";
import {DeleteOutlined, SettingOutlined} from "@ant-design/icons";

import ReplicationCard from "./ReplicationCard";
import {Client, FullReplicationInfo} from "reduct-js";
import {mockJSDOM} from "../../Helpers/TestHelpers";

describe("ReplicationCard", () => {
  let clientMock: Client;
  let replicationMock: FullReplicationInfo;
  let onRemovedMock: jest.Mock;
  let onShowMock: jest.Mock;
  let wrapper: ReactWrapper;

  beforeEach(() => {
    mockJSDOM();

    clientMock = new Client("dummyURL");
    clientMock.deleteReplication = jest.fn().mockResolvedValue(undefined);

    replicationMock = {
      info: {
        name: "TestReplication",
        isActive: true,
        isProvisioned: false,
        pendingRecords: 100n,
      },
      settings: {
        srcBucket: "sourceBucket1",
        dstBucket: "targetBucket1",
        dstHost: "targetHost1",
        dstToken: "targetToken1",
        entries: ["entry1", "entry2"],
        include: {},
        exclude: {},
      },
      diagnostics: {
        hourly: {
          ok: 50n,
          errors: {
            1: {
              count: 5,
              lastMessage: "Test error message",
            },


          },
          errored: 5n,
        },
      },
    };

    onRemovedMock = jest.fn();
    onShowMock = jest.fn();
  });

  afterEach(() => {
    if (wrapper && wrapper.length) {
      wrapper.unmount();
    }
  });

  it("renders without crashing", async () => {
    wrapper = mount(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemoved={onRemovedMock}
        onShow={onShowMock}
        permissions={{fullAccess: true}}
      />
    );

    expect(wrapper.find(Card).exists()).toBe(true);
    expect(wrapper.find(".ReplicationCard").exists()).toBe(true);
  });

  it("opens settings modal on settings icon click", () => {
    wrapper = mount(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemoved={onRemovedMock}
        onShow={onShowMock}
        permissions={{fullAccess: true}}
      />
    );

    act(() => {
      wrapper.find(SettingOutlined).simulate("click");
    });
    wrapper.update();

    expect(wrapper.find("[data-testid='settings-modal']").at(0).prop("open")).toBe(true);
  });

  it("shows remove confirmation when remove icon is clicked", async () => {
    wrapper = mount(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemoved={onRemovedMock}
        onShow={onShowMock}
        permissions={{fullAccess: true}}
      />
    );

    await act(async () => {
      wrapper.find(DeleteOutlined).simulate("click");
    });
    wrapper.update();

    expect(wrapper.find("[data-testid='delete-modal']").exists()).toBe(true);

  });

  it("removes replication on confirm", async () => {
    wrapper = mount(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemoved={onRemovedMock}
        onShow={onShowMock}
        permissions={{fullAccess: true}}
      />
    );

    // Open the removal confirmation modal
    await act(async () => {
      wrapper.find(DeleteOutlined).simulate("click");
    });

    // Make sure the modal is now part of the DOM
    wrapper.update();

    // Type the confirmation name into the input field
    await act(async () => {
      wrapper.find("input[data-testid='confirm-input']").simulate("change", {target: {value: replicationMock.info.name}});
    });

    // Click the confirmation button
    await act(async () => {
      wrapper.find("button").filterWhere((btn) => btn.text() === "Remove").simulate("click");
    });

    expect(clientMock.deleteReplication).toHaveBeenCalledWith(replicationMock.info.name);
    expect(onRemovedMock).toHaveBeenCalledWith(replicationMock.info.name);
  });

  it("does not show remove button if replication is provisioned", () => {
    const provisionedReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        isProvisioned: true,
      }
    };

    wrapper = mount(
      <ReplicationCard
        replication={provisionedReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemoved={onRemovedMock}
        onShow={onShowMock}
        permissions={{fullAccess: true}}
      />
    );

    expect(wrapper.find(DeleteOutlined).exists()).toBe(false);
  });
});