import React from "react";
import { mount } from "enzyme";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";

import Dashboard from "./Dashboard";
import { Client, ServerInfo } from "reduct-js";

const mockPush = jest.fn();
jest.mock("react-router-dom", () => ({
  useHistory: () => ({
    push: mockPush,
  }),
}));

describe("Dashboard", () => {
  const client = new Client("");
  const backend = {
    get client() {
      return client;
    },
    login: jest.fn(),
    logout: jest.fn(),
    isAllowed: jest.fn(),
    me: jest.fn(),
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
    jest.clearAllMocks();
    mockJSDOM();

    client.getInfo = jest.fn().mockResolvedValue(serverInfo);
    client.getBucketList = jest.fn().mockResolvedValue([
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
    client.getInfo = jest.fn().mockResolvedValue(serverInfo);
    client.getBucketList = jest.fn().mockResolvedValue([]);

    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    const html = (await waitUntilFind(wrapper, "#ServerInfo")).hostNodes();

    expect(html.text()).toContain("0.4.0");
    expect(html.text()).toContain("16 minutes");
    expect(html.text()).toContain("2 KB");
  });

  it("should show license info when clicked on the tab", async () => {
    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    const licenseTab = (await waitUntilFind(wrapper, ".ant-tabs-tab-btn"))
      .hostNodes()
      .at(1);
    licenseTab.simulate("click");

    expect(wrapper.text()).toContain("Business Source License (BUSL)");
  });

  it("should show bucket info", async () => {
    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    const bucket = (await waitUntilFind(wrapper, "#bucket_1")).hostNodes();
    expect(bucket.text()).toContain("bucket_1");
    expect(bucket.text()).toContain("1 KB");
    expect(bucket.text()).toContain("10 seconds");
  });

  it("should order buckets by last records", async () => {
    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    let bucket = await waitUntilFind(wrapper, "#bucket_1");
    expect(bucket.at(0).key()).toEqual("1");

    bucket = await waitUntilFind(wrapper, "#bucket_2");
    expect(bucket.at(0).key()).toEqual("0");
  });

  it("should push to BucketDetail if user click on bucket card", async () => {
    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    const bucket = (await waitUntilFind(wrapper, "#bucket_1")).hostNodes();
    bucket.props().onClick();

    expect(mockPush).toBeCalledWith("/buckets/bucket_1");
  });

  it("shows warning icon if license is invalid", async () => {
    client.getInfo = jest.fn().mockResolvedValue({
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

    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    const warningIcon = (
      await waitUntilFind(wrapper, ".warningIcon")
    ).hostNodes();
    expect(warningIcon).toHaveLength(1);
  });

  it("does not show warning icon if license is valid", async () => {
    client.getInfo = jest.fn().mockResolvedValue({
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

    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: true }} />,
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    wrapper.update();
    expect(wrapper.find(".warningIcon").hostNodes()).toHaveLength(0);
  });

  it("shows correct usage and bucket count even if bucket list is filtered", async () => {
    client.getInfo = jest.fn().mockResolvedValue({
      ...serverInfo,
      bucketCount: 5n,
      usage: 1000n * 1000n * 1000n * 50n, // 50 GB
    });

    client.getBucketList = jest.fn().mockResolvedValue([
      {
        name: "bucket_visible",
        entryCount: 2,
        size: 1000n,
        oldestRecord: 10n,
        latestRecord: 10000010n,
      },
    ]);

    const wrapper = mount(
      <Dashboard backendApi={backend} permissions={{ fullAccess: false }} />,
    );

    const serverInfoPanel = (
      await waitUntilFind(wrapper, "#ServerInfo")
    ).hostNodes();
    expect(serverInfoPanel.text()).toContain("50 GB");
    expect(serverInfoPanel.text()).toContain("5");

    const bucket = (
      await waitUntilFind(wrapper, "#bucket_visible")
    ).hostNodes();
    expect(bucket.text()).toContain("bucket_visible");
  });
});
