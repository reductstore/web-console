import React from "react";
import { render, waitFor } from "@testing-library/react";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";

import { Client, ReplicationInfo, ReplicationSettings } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import ReplicationSettingsForm from "./ReplicationSettingsForm";
import { Diagnostics } from "reduct-js/lib/cjs/messages/Diagnostics";

describe("Replication::ReplicationSettingsForm", () => {
  const client = new Client("dummyURL");
  let container: HTMLElement;

  beforeEach(async () => {
    vi.clearAllMocks();
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

    client.getReplication = vi.fn().mockResolvedValue({
      info: mockReplicationInfo,
      settings: mockReplicationSettings,
      diagnostics: mockDiagnostics,
    });

    client.updateReplication = vi.fn().mockResolvedValue(undefined);
    client.createReplication = vi.fn().mockResolvedValue(undefined);
    client.getBucket = vi.fn().mockResolvedValue({
      getEntryList: vi
        .fn()
        .mockResolvedValue([{ name: "entry1" }, { name: "entry2" }]),
    });

    const result = render(
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
    ({ container } = result);

    // Wait for the component to finish rendering
    await waitFor(() => expect(container.querySelector("form")).toBeTruthy());
  });

  it("renders without crashing", () => {
    expect(container.querySelector("form")).toBeTruthy();
  });

  it("shows a form with all fields", () => {
    expect(container.querySelector("#replicationForm_name")).toBeTruthy();
    expect(container.querySelector("#replicationForm_srcBucket")).toBeTruthy();
    expect(container.querySelector("#replicationForm_dstBucket")).toBeTruthy();
    expect(container.querySelector("#replicationForm_dstHost")).toBeTruthy();
    expect(container.querySelector("#replicationForm_dstToken")).toBeTruthy();
    expect(container.querySelector("#replicationForm_entries")).toBeTruthy();
  });

  it("shows the replication disabled name if it is provided", () => {
    const input = container.querySelector(
      "#replicationForm_name",
    ) as HTMLInputElement;
    expect(input.value).toEqual("TestReplication");
    expect(input.disabled).toBeTruthy();
  });

  it("shows the selected source bucket if it is provided", async () => {
    await waitFor(() =>
      expect(
        container.querySelector("#replicationForm_srcBucket"),
      ).toBeTruthy(),
    );
    const selectContent = container
      .querySelector("#replicationForm_srcBucket")
      ?.closest(".ant-select")
      ?.querySelector(".ant-select-content");
    expect(selectContent?.textContent).toContain("Bucket1");
  });

  it("shows the destination bucket if it is provided", async () => {
    await waitFor(() =>
      expect(
        container.querySelector("#replicationForm_dstBucket"),
      ).toBeTruthy(),
    );
    const input = container.querySelector(
      "#replicationForm_dstBucket",
    ) as HTMLInputElement;
    expect(input.value).toEqual("destinationBucket");
  });

  it("shows the destination host if it is provided", async () => {
    await waitFor(() =>
      expect(container.querySelector("#replicationForm_dstHost")).toBeTruthy(),
    );
    const input = container.querySelector(
      "#replicationForm_dstHost",
    ) as HTMLInputElement;
    expect(input.value).toEqual("destinationHost");
  });

  it("shows the selected entries if they are provided", async () => {
    await waitFor(() =>
      expect(container.querySelector("#replicationForm_entries")).toBeTruthy(),
    );
    const selectContainer = container
      .querySelector("#replicationForm_entries")
      ?.closest(".ant-select");
    const selectedItems = selectContainer?.querySelectorAll(
      ".ant-select-selection-item-content, .ant-select-content",
    );
    const texts = Array.from(selectedItems || []).map((el) => el.textContent);
    expect(texts).toContain("entry1");
    expect(texts).toContain("entry2");
  });

  it("disables record settings inputs and radios in read-only mode", async () => {
    const { container: readOnlyContainer } = render(
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
    await waitFor(() =>
      expect(readOnlyContainer.querySelector("form")).toBeTruthy(),
    );

    // Check that each Radio.Group is disabled
    const radioGroups = readOnlyContainer.querySelectorAll(".ant-radio-group");
    radioGroups.forEach((radioGroup) => {
      const radios = radioGroup.querySelectorAll("input[type='radio']");
      radios.forEach((radio) => {
        expect((radio as HTMLInputElement).disabled).toBe(true);
      });
    });

    // Check that each Input within record settings is disabled
    const recordSettingsInputs = readOnlyContainer.querySelectorAll(
      "input[placeholder='Key'], input[placeholder='Value']",
    );
    recordSettingsInputs.forEach((input) => {
      expect((input as HTMLInputElement).disabled).toBe(true);
    });

    // Check that the Update Replication button is disabled
    const buttons = readOnlyContainer.querySelectorAll("button");
    const updateButton = Array.from(buttons).find(
      (btn) => btn.textContent === "Update Replication",
    );
    expect(updateButton).toBeTruthy();
    expect((updateButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("verifies Monaco editor is non-editable in read-only mode", async () => {
    const { container: readOnlyContainer } = render(
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

    await waitFor(() =>
      expect(readOnlyContainer.querySelector("form")).toBeTruthy(),
    );

    // The component is rendered in readOnly mode; the submit button should be disabled
    const submitButton = readOnlyContainer.querySelector(
      "button[type='submit']",
    ) as HTMLButtonElement;
    expect(submitButton?.disabled).toBe(true);
  });

  it("verifies When condition JSON editor respects readOnly property", async () => {
    const ref = React.createRef<ReplicationSettingsForm>();

    const { container: readOnlyContainer } = render(
      <MemoryRouter>
        <ReplicationSettingsForm
          ref={ref}
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={true}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(readOnlyContainer.querySelector("form")).toBeTruthy(),
    );

    const component = ref.current!;
    const setStateSpy = vi.spyOn(component, "setState");
    const initialFormattedWhen = component.state.formattedWhen;

    component.handleWhenConditionChange('{"test": "value"}');

    expect(setStateSpy).not.toHaveBeenCalled();
    expect(component.state.formattedWhen).toEqual(initialFormattedWhen);

    setStateSpy.mockRestore();
  });

  it("verifies handleWhenConditionChange functionality when not in read-only mode", async () => {
    const ref = React.createRef<ReplicationSettingsForm>();

    const { container: editContainer } = render(
      <MemoryRouter>
        <ReplicationSettingsForm
          ref={ref}
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          replicationName={"TestReplication"}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(editContainer.querySelector("form")).toBeTruthy(),
    );

    const component = ref.current!;
    const setStateSpy = vi.spyOn(component, "setState");
    const newValue = '{"test": "value"}';

    act(() => {
      component.handleWhenConditionChange(newValue);
    });

    expect(setStateSpy).toHaveBeenCalled();
    expect(component.state.formattedWhen).toEqual(newValue);

    setStateSpy.mockRestore();
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
      const ref = React.createRef<ReplicationSettingsForm>();

      render(
        <MemoryRouter>
          <ReplicationSettingsForm
            ref={ref}
            client={client}
            onCreated={() => (onCreatedCalled[0] = true)}
            sourceBuckets={["Bucket1", "Bucket2"]}
            readOnly={false}
          />
        </MemoryRouter>,
      );

      // No replicationName, so the form renders immediately
      const component = ref.current!;

      await act(async () => {
        await component.onFinish(form_settings as any);
      });

      await waitFor(() => expect(onCreatedCalled[0]).toBe(true));

      expect(client.createReplication).toBeCalledWith(
        "NewReplication",
        expected_settings,
      );

      expect(onCreatedCalled[0]).toBe(true);
    });

    it("calls updateReplication on form submission", async () => {
      const onCreatedCalled = [false];
      const ref = React.createRef<ReplicationSettingsForm>();

      const { container: updateContainer } = render(
        <MemoryRouter>
          <ReplicationSettingsForm
            ref={ref}
            client={client}
            onCreated={() => (onCreatedCalled[0] = true)}
            sourceBuckets={["Bucket1", "Bucket2"]}
            replicationName={"TestReplication"}
            readOnly={false}
          />
        </MemoryRouter>,
      );

      await waitFor(() =>
        expect(updateContainer.querySelector("form")).toBeTruthy(),
      );

      const component = ref.current!;

      await act(async () => {
        await component.onFinish(form_settings as any);
      });

      await waitFor(() => expect(onCreatedCalled[0]).toBe(true));

      expect(client.updateReplication).toBeCalledWith(
        "TestReplication",
        expected_settings,
      );
    });
  });
});
