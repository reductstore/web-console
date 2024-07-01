import React from "react";
import { ReactWrapper, mount } from "enzyme";
import { MemoryRouter } from "react-router-dom";

import { Client, ReplicationInfo, ReplicationSettings } from "reduct-js";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import CreateOrUpdate from "./CreateOrUpdate";
import { Diagnostics } from "reduct-js/lib/cjs/messages/Diagnostics";

describe("Replication::CreateOrUpdate", () => {
  const client = new Client("dummyURL");
  let wrapper: ReactWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
    });

    const mockReplicationSettings = ReplicationSettings.parse({
      src_bucket: "Bucket1",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
      include: { label1: "value1" },
      exclude: { label2: "value2" },
      each_n: 10n,
      each_s: 0.5,
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
        },
      },
    });

    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockReplicationSettings,
      diagnostics: mockDiagnostics,
    });

    client.updateReplication = jest.fn().mockResolvedValue(undefined);

    client.createReplication = jest.fn().mockResolvedValue(undefined);

    client.getBucket = jest.fn().mockResolvedValue({
      getEntryList: jest
        .fn()
        .mockResolvedValue([{ name: "entry1" }, { name: "entry2" }]),
    });

    wrapper = mount(
      <MemoryRouter>
        <CreateOrUpdate
          client={client}
          onCreated={() => console.log("")}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    if (wrapper && wrapper.length) {
      wrapper.unmount();
    }
  });

  it("renders without crashing", () => {
    expect(wrapper.find("form").exists()).toBeTruthy();
  });

  it("shows a form with all fields", () => {
    expect(wrapper.find({ name: "name" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "srcBucket" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "dstBucket" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "dstHost" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "dstToken" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "entries" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "recordSettings" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "eachN" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "eachS" }).exists()).toBeTruthy();
  });

  it("shows the replication name if it is provided", () => {
    expect(wrapper.find({ name: "name" }).find("input").prop("value")).toEqual(
      "TestReplication",
    );
  });

  it("shows the selected source bucket if it is provided", async () => {
    await waitUntilFind(wrapper, "Select[name='srcBucket']");
    const selectedOptionText = wrapper
      .find({ name: "srcBucket" })
      .find(".ant-select-selection-item")
      .text();
    expect(selectedOptionText).toEqual("Bucket1");
  });

  it("shows the destination bucket if it is provided", async () => {
    await waitUntilFind(wrapper, { name: "dstBucket" });
    expect(
      wrapper.find({ name: "dstBucket" }).find("input").prop("value"),
    ).toEqual("destinationBucket");
  });

  it("shows the destination host if it is provided", async () => {
    await waitUntilFind(wrapper, { name: "dstHost" });
    expect(
      wrapper.find({ name: "dstHost" }).find("input").prop("value"),
    ).toEqual("destinationHost");
  });

  it("shows the selected entries if they are provided", async () => {
    await waitUntilFind(wrapper, "Select[name='entries']");
    const selectedOptionText = wrapper
      .find({ name: "entries" })
      .find(".ant-select-selection-item");
    expect(selectedOptionText.at(0).text()).toEqual("entry1");
    expect(selectedOptionText.at(1).text()).toEqual("entry2");
  });

  it("shows the number of records to replicate every Nth record if it is provided", async () => {
    await waitUntilFind(wrapper, { name: "eachN" });
    expect(wrapper.find({ name: "eachN" }).find("input").prop("value")).toEqual(
      "10",
    );
  });

  it("shows timeinterval to replicate a record if it is provided", async () => {
    await waitUntilFind(wrapper, { name: "eachS" });
    expect(wrapper.find({ name: "eachS" }).find("input").prop("value")).toEqual(
      "0.5",
    );
  });

  it("disables record settings inputs and radios in read-only mode", () => {
    wrapper = mount(
      <MemoryRouter>
        <CreateOrUpdate
          client={client}
          onCreated={() => console.log("")}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={true}
        />
      </MemoryRouter>,
    );

    // Find all Radio.Group and Input components within the record settings Form.List
    const recordSettingsRadios = wrapper.find("Form.List").find("Radio.Group");
    const recordSettingsInputs = wrapper.find("Form.List").find("Input");

    // Check that each Radio.Group is disabled
    recordSettingsRadios.forEach((radioGroup) => {
      expect(radioGroup.prop("disabled")).toBe(true);
    });

    // Check that each Input (for both key and value within each record setting) is disabled
    recordSettingsInputs.forEach((input) => {
      expect(input.prop("disabled")).toBe(true);
    });

    // Check that the delete buttons for each record setting are disabled
    const deleteRuleButtons = wrapper
      .find("Form.List")
      .find("Button[type='primary']")
      .find("DeleteOutlined");
    deleteRuleButtons.forEach((deleteButton) => {
      expect(deleteButton.prop("disabled")).toBe(true);
    });

    // Check that the Add Rule button is disabled
    const button = wrapper
      .find("Button")
      .filterWhere((node) => node.text() === "Update Replication");
    expect(button.prop("disabled")).toBe(true);
  });
});
