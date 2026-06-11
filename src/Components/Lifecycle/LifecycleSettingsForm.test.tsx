import React from "react";
import { render, waitFor } from "@testing-library/react";
import { act } from "react";
import { MemoryRouter } from "react-router-dom";

import {
  Client,
  LifecycleInfo,
  LifecycleMode,
  LifecycleSettings,
} from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import LifecycleSettingsForm from "./LifecycleSettingsForm";

describe("Lifecycle::LifecycleSettingsForm", () => {
  const client = new Client("dummyURL");
  let container: HTMLElement;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJSDOM();

    const mockLifecycleInfo = LifecycleInfo.parse({
      name: "test-lifecycle",
      mode: LifecycleMode.ENABLED,
      is_running: false,
      is_provisioned: false,
    });

    const mockLifecycleSettings = LifecycleSettings.parse({
      type: "delete",
      bucket: "Bucket1",
      entries: ["entry1", "entry2"],
      max_age: "1h",
      interval: "10m",
      when: {},
      mode: "enabled",
    });

    client.getLifecycle = vi.fn().mockResolvedValue({
      info: mockLifecycleInfo,
      settings: mockLifecycleSettings,
    });

    client.updateLifecycle = vi.fn().mockResolvedValue(undefined);
    client.createLifecycle = vi.fn().mockResolvedValue(undefined);
    client.getBucket = vi.fn().mockResolvedValue({
      getEntryList: vi
        .fn()
        .mockResolvedValue([{ name: "entry1" }, { name: "entry2" }]),
    });

    const result = render(
      <MemoryRouter>
        <LifecycleSettingsForm
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          lifecycleName={"test-lifecycle"}
          readOnly={false}
        />
      </MemoryRouter>,
    );
    ({ container } = result);

    await waitFor(() => expect(container.querySelector("form")).toBeTruthy());
  });

  it("renders without crashing", () => {
    expect(container.querySelector("form")).toBeTruthy();
    expect(container.querySelector("#lifecycleForm_name")).toBeTruthy();
    expect(container.querySelector("#lifecycleForm_bucket")).toBeTruthy();
    expect(container.querySelector("#lifecycleForm_maxAge")).toBeTruthy();
  });

  it("shows lifecycle name and disables it for update mode", () => {
    const input = container.querySelector(
      "#lifecycleForm_name",
    ) as HTMLInputElement;
    expect(input.value).toEqual("test-lifecycle");
    expect(input.disabled).toBeTruthy();
  });

  it("calls createLifecycle on form submission", async () => {
    const onCreatedCalled = [false];
    const ref = React.createRef<LifecycleSettingsForm>();

    render(
      <MemoryRouter>
        <LifecycleSettingsForm
          ref={ref}
          client={client}
          onCreated={() => (onCreatedCalled[0] = true)}
          sourceBuckets={["Bucket1", "Bucket2"]}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    const component = ref.current!;

    await act(async () => {
      await component.onFinish({
        name: "new-lifecycle",
        lifecycleType: "delete",
        bucket: "Bucket1",
        maxAge: "1h",
        interval: "10m",
        entries: ["entry1"],
      });
    });

    await waitFor(() => expect(onCreatedCalled[0]).toBe(true));

    expect(client.createLifecycle).toHaveBeenCalledWith(
      "new-lifecycle",
      expect.objectContaining({
        lifecycleType: "delete",
        bucket: "Bucket1",
        maxAge: "1h",
        interval: "10m",
        entries: ["entry1"],
      }),
    );
  });

  it("creates the lifecycle in dry run mode when the checkbox is set", async () => {
    const ref = React.createRef<LifecycleSettingsForm>();

    render(
      <MemoryRouter>
        <LifecycleSettingsForm
          ref={ref}
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    await act(async () => {
      await ref.current!.onFinish({
        name: "new-lifecycle",
        lifecycleType: "delete",
        bucket: "Bucket1",
        maxAge: "1h",
        entries: [],
        dryRun: true,
      });
    });

    expect(client.createLifecycle).toHaveBeenCalledWith(
      "new-lifecycle",
      expect.objectContaining({ mode: LifecycleMode.DRY_RUN }),
    );
  });

  it("calls updateLifecycle on form submission", async () => {
    const onCreatedCalled = [false];
    const ref = React.createRef<LifecycleSettingsForm>();

    const { container: updateContainer } = render(
      <MemoryRouter>
        <LifecycleSettingsForm
          ref={ref}
          client={client}
          onCreated={() => (onCreatedCalled[0] = true)}
          sourceBuckets={["Bucket1", "Bucket2"]}
          lifecycleName={"test-lifecycle"}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(updateContainer.querySelector("form")).toBeTruthy(),
    );

    const component = ref.current!;

    await act(async () => {
      await component.onFinish({
        name: "test-lifecycle",
        lifecycleType: "delete",
        bucket: "Bucket2",
        maxAge: "2h",
        interval: "15m",
        entries: ["entry2"],
      });
    });

    await waitFor(() => expect(onCreatedCalled[0]).toBe(true));

    expect(client.updateLifecycle).toHaveBeenCalledWith(
      "test-lifecycle",
      expect.objectContaining({
        lifecycleType: "delete",
        bucket: "Bucket2",
        maxAge: "2h",
        interval: "15m",
        entries: ["entry2"],
      }),
    );
  });

  it("shows error alert when save fails", async () => {
    const ref = React.createRef<LifecycleSettingsForm>();

    const { container: errorContainer } = render(
      <MemoryRouter>
        <LifecycleSettingsForm
          ref={ref}
          client={client}
          onCreated={() => null}
          sourceBuckets={["Bucket1", "Bucket2"]}
          lifecycleName={"test-lifecycle"}
          readOnly={false}
        />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(errorContainer.querySelector("form")).toBeTruthy(),
    );

    const component = ref.current!;

    // Set invalid JSON in the when condition
    await act(async () => {
      component.setState({ formattedWhen: "invalid json {{{" });
    });

    await act(async () => {
      await component.onFinish({
        name: "test-lifecycle",
        lifecycleType: "delete",
        bucket: "Bucket1",
        maxAge: "1h",
        entries: [],
      });
    });

    await waitFor(() => {
      expect(errorContainer.querySelector(".ant-alert-error")).toBeTruthy();
    });
  });
});
