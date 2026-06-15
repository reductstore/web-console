import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";

import {
  Client,
  LifecycleInfo,
  LifecycleSettings,
  LifecycleMode,
} from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import LifecycleDetail from "./LifecycleDetail";

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("LifecycleDetail", () => {
  const client = new Client("dummyURL");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockJSDOM();

    const info = LifecycleInfo.parse({
      name: "TestLifecycle",
      type: "delete",
      mode: LifecycleMode.ENABLED,
      is_running: true,
      is_provisioned: false,
    });

    const settings = LifecycleSettings.parse({
      type: "delete",
      bucket: "bucket1",
      entries: ["entry1", "entry2"],
      older_than: "1h",
      interval: "10m",
      when: {},
      mode: "enabled",
    });

    client.getLifecycle = vi.fn().mockResolvedValue({ info, settings });
    client.getBucketList = vi.fn().mockResolvedValue([{ name: "bucket1" }]);

    await act(async () => {
      render(
        <MemoryRouter>
          <LifecycleDetail client={client} permissions={{ fullAccess: true }} />
        </MemoryRouter>,
      );
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("fetches lifecycle and buckets on mount and interval", async () => {
    expect(client.getLifecycle).toHaveBeenCalledTimes(1);
    expect(client.getBucketList).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(client.getLifecycle).toHaveBeenCalledTimes(2);
    expect(client.getBucketList).toHaveBeenCalledTimes(2);
  });

  it("shows lifecycle card content", async () => {
    expect(screen.getByText("TestLifecycle")).toBeTruthy();
    expect(screen.queryByText("Provisioned")).toBeNull();
    expect(screen.getByText("Delete")).toBeTruthy();
    expect(screen.getByText("{}", { exact: false })).toBeTruthy();
    expect(screen.getByText("bucket1")).toBeTruthy();
    expect(screen.getByText("1h")).toBeTruthy();
  });

  it("renders mode control and action buttons", async () => {
    expect(screen.getByLabelText("Change mode")).toBeTruthy();
    expect(screen.getByLabelText("Back")).toBeTruthy();
    expect(screen.getByLabelText("Settings")).toBeTruthy();
    expect(screen.getByLabelText("Remove")).toBeTruthy();
  });
});
