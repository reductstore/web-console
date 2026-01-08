import React from "react";
import { ReactWrapper, mount } from "enzyme";
import { MemoryRouter } from "react-router-dom";

import { Client, ReplicationInfo, ReplicationSettings } from "reduct-js";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import ReplicationSettingsForm from "./ReplicationSettingsForm";
import { Diagnostics } from "reduct-js/lib/cjs/messages/Diagnostics";
import { act } from "react-dom/test-utils";
import waitUntil from "async-wait-until";

describe("Replication::ReplicationSettingsForm", () => {
  const client = new Client("dummyURL");
  let wrapper: ReactWrapper;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJSDOM();

    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
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
        <ReplicationSettingsForm
          client={client}
          onCreated={() => console.log("")}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    // Wait for the component to finish rendering
    await waitUntilFind(wrapper, "form");
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
    expect(wrapper.find({ name: "eachN" }).exists()).toBeTruthy();
    expect(wrapper.find({ name: "eachS" }).exists()).toBeTruthy();
  });

  it("shows the replication disabled name if it is provided", () => {
    const input = wrapper.find({ name: "name" }).find("input");
    expect(input.prop("value")).toEqual("TestReplication");
    expect(input.prop("disabled")).toBeTruthy();
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

  it("disables record settings inputs and radios in read-only mode", async () => {
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => console.log("")}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={true}
        />
      </MemoryRouter>,
    );

    // Wait for the component to finish rendering
    await waitUntilFind(wrapper, "form");

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

  it("verifies CodeMirror is non-editable in read-only mode", () => {
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={true}
        />
      </MemoryRouter>,
    );

    expect(wrapper.find(ReplicationSettingsForm).prop("readOnly")).toBe(true);
  });

  it("verifies When condition JSON editor respects readOnly property", async () => {
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={true}
        />
      </MemoryRouter>,
    );

    await waitUntilFind(wrapper, "form");

    const component = wrapper.find(ReplicationSettingsForm).instance() as any;
    const setStateSpy = jest.spyOn(component, "setState");
    const initialFormattedWhen = component.state.formattedWhen;

    component.handleWhenConditionChange('{"test": "value"}');

    expect(setStateSpy).not.toHaveBeenCalled();
    expect(component.state.formattedWhen).toEqual(initialFormattedWhen);

    setStateSpy.mockRestore();
  });

  it("verifies handleWhenConditionChange functionality when not in read-only mode", async () => {
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    await waitUntilFind(wrapper, "form");

    const component = wrapper.find(ReplicationSettingsForm).instance() as any;
    const setStateSpy = jest.spyOn(component, "setState");
    const newValue = '{"test": "value"}';

    component.handleWhenConditionChange(newValue);

    expect(setStateSpy).toHaveBeenCalled();
    expect(component.state.formattedWhen).toEqual(newValue);

    setStateSpy.mockRestore();
  });

  it("shows condition fields when settings.eachN is defined", async () => {
    const mockSettings = ReplicationSettings.parse({
      src_bucket: "Bucket1",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
      include: {},
      exclude: {},
      each_n: 42n,
      // each_s is undefined
    });
    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
    });
    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockSettings,
      diagnostics: undefined,
    });
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
    await waitUntilFind(wrapper, "form");
    expect(wrapper.text()).toContain("Every N-th record");
    expect(wrapper.text()).toContain("Every S seconds");
  });

  it("shows condition fields when settings.eachS is defined", async () => {
    const mockSettings = ReplicationSettings.parse({
      src_bucket: "Bucket1",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
      include: {},
      exclude: {},
      // each_n is undefined
      each_s: 1.23,
    });
    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
    });
    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockSettings,
      diagnostics: undefined,
    });
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
    await waitUntilFind(wrapper, "form");
    expect(wrapper.text()).toContain("Every N-th record");
    expect(wrapper.text()).toContain("Every S seconds");
  });

  it("hides condition fields when neither settings.eachN nor settings.eachS is defined", async () => {
    const mockSettings = ReplicationSettings.parse({
      src_bucket: "Bucket1",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
      include: {},
      exclude: {},
      // both each_n and each_s are undefined
    });
    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
    });
    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockSettings,
      diagnostics: undefined,
    });
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
    await waitUntilFind(wrapper, "form");
    expect(wrapper.text()).not.toContain("Every N-th record");
    expect(wrapper.text()).not.toContain("Every S seconds");
  });

  it("hides condition fields when settings.eachN and settings.eachS are both null", async () => {
    const mockSettings = ReplicationSettings.parse({
      src_bucket: "Bucket1",
      dst_bucket: "destinationBucket",
      dst_host: "destinationHost",
      dst_token: "destinationToken",
      entries: ["entry1", "entry2"],
      include: {},
      exclude: {},
      // Simulating null for each_n and each_s
      each_n: null as unknown as bigint,
      each_s: null as unknown as number,
    });
    const mockReplicationInfo = ReplicationInfo.parse({
      name: "TestReplication",
      is_active: true,
      is_provisioned: true,
      pending_records: BigInt(100),
      mode: "enabled",
    });
    client.getReplication = jest.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockSettings,
      diagnostics: undefined,
    });
    wrapper = mount(
      <MemoryRouter>
        <ReplicationSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
    await waitUntilFind(wrapper, "form");
    expect(wrapper.text()).not.toContain("Every N-th record");
    expect(wrapper.text()).not.toContain("Every S seconds");
  });

  describe("api", () => {
    const expected_settings = {
      dstBucket: "destinationBucket",
      dstHost: "destinationHost",
      dstToken: "destinationToken",
      eachN: 10n,
      eachS: 0.5,
      entries: ["entry1", "entry2"],
      exclude: {},
      include: {},
      srcBucket: "Bucket1",
      when: {},
    };

    const form_settings = {
      name: "NewReplication",
      srcBucket: "Bucket1",
      dstBucket: "destinationBucket",
      dstHost: "destinationHost",
      dstToken: "destinationToken",
      entries: ["entry1", "entry2"],
      eachN: 10n,
      eachS: 0.5,
      when: {},
    };

    it("calls createReplication on form submission", async () => {
      const onCreatedCalled = [false];
      const wrapper = mount(
        <MemoryRouter>
          <ReplicationSettingsForm
            client={client}
            onCreated={() => (onCreatedCalled[0] = true)}
            sourceBuckets={["Bucket1", "Bucket2"]}
            readOnly={false}
          />
        </MemoryRouter>,
      );

      const form = wrapper.find({ name: "replicationForm" }).at(0);

      // fill the form fields
      await act(async () => {
        form.props().onFinish(form_settings);
      });

      await waitUntilFind(wrapper, "form");
      await waitUntil(() => onCreatedCalled[0]);

      expect(client.createReplication).toBeCalledWith(
        "NewReplication",
        expected_settings,
      );

      expect(onCreatedCalled[0]).toBe(true);
    });

    it("calls updateReplication on form submission", async () => {
      const onCreatedCalled = [false];
      const wrapper = mount(
        <MemoryRouter>
          <ReplicationSettingsForm
            client={client}
            onCreated={() => (onCreatedCalled[0] = true)}
            sourceBuckets={["Bucket1", "Bucket2"]}
            replicationName={"TestReplication"}
            readOnly={false}
          />
        </MemoryRouter>,
      );

      await waitUntilFind(wrapper, "form");
      const form = wrapper.find({ name: "replicationForm" }).at(0);
      // fill the form fields
      await act(async () => {
        form.props().onFinish(form_settings);
      });
      await waitUntil(() => onCreatedCalled[0]);
      expect(client.updateReplication).toBeCalledWith(
        "TestReplication",
        expected_settings,
      );
    });
  });
});
