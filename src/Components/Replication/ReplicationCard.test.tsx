import React from "react";
import type { Mock } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";

import ReplicationCard from "./ReplicationCard";
import {
  APIError,
  Client,
  FullReplicationInfo,
  ReplicationMode,
} from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("ReplicationCard", () => {
  let clientMock: Client;
  let replicationMock: FullReplicationInfo;
  let onRemoveMock: Mock;
  let onShowMock: Mock;
  let onModeChangeMock: Mock;

  beforeEach(() => {
    mockJSDOM();

    // Mock ResizeObserver for antd components
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    clientMock = new Client("dummyURL");
    clientMock.deleteReplication = vi.fn().mockResolvedValue(undefined);
    clientMock.setReplicationMode = vi.fn().mockResolvedValue(undefined);

    replicationMock = {
      info: {
        name: "TestReplication",
        isActive: true,
        isProvisioned: false,
        pendingRecords: 100n,
        mode: "enabled",
      },
      settings: {
        srcBucket: "sourceBucket1",
        dstBucket: "targetBucket1",
        dstHost: "targetHost1",
        dstToken: "targetToken1",
        entries: ["entry1", "entry2"],
        include: {},
        exclude: {},
      } as any,
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

    onRemoveMock = vi.fn();
    onShowMock = vi.fn();
    onModeChangeMock = vi.fn();
  });

  it("renders without crashing", async () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.querySelector(".ant-card")).toBeTruthy();
    expect(container.querySelector(".ReplicationCard")).toBeTruthy();
  });

  it("opens settings modal on settings icon click", () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    act(() => {
      fireEvent.click(container.querySelector(".anticon-setting")!);
    });

    // Modal renders in a portal; query on document
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("shows remove confirmation when remove icon is clicked", async () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    await act(async () => {
      fireEvent.click(container.querySelector('[title="Remove"]')!);
    });

    // Modal renders in a portal; query on document
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("removes replication on confirm", async () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    // Open the removal confirmation modal
    await act(async () => {
      fireEvent.click(container.querySelector('[title="Remove"]')!);
    });

    // Wait for the modal to appear, then type the confirmation name
    await waitFor(() => {
      expect(screen.getByTestId("confirm-input")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.change(screen.getByTestId("confirm-input"), {
        target: { value: replicationMock.info.name },
      });
    });

    // Click the confirmation button (disabled/loading clears once name matches)
    await waitFor(() => {
      const removeBtns = screen.getAllByRole("button");
      const removeBtn = removeBtns.find(
        (btn) => btn.textContent?.trim() === "Remove",
      );
      expect(removeBtn).toBeDefined();
      expect(removeBtn).not.toBeDisabled();
    });
    await act(async () => {
      const removeBtns = screen.getAllByRole("button");
      const removeBtn = removeBtns.find(
        (btn) => btn.textContent?.trim() === "Remove",
      )!;
      fireEvent.click(removeBtn);
    });

    expect(clientMock.deleteReplication).toHaveBeenCalledWith(
      replicationMock.info.name,
    );
    expect(onRemoveMock).toHaveBeenCalledWith(replicationMock.info.name);
  });

  it("show inactive remove icon for provisioned replications", () => {
    const provisionedReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        isProvisioned: true,
      },
    };

    const { container } = render(
      <ReplicationCard
        replication={provisionedReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    const deleteIcon = container.querySelector('[title="Remove"]');
    expect(deleteIcon).toBeTruthy();
    expect(deleteIcon).toHaveStyle({
      color: "rgb(128, 128, 128)",
      cursor: "not-allowed",
    });
  });

  it("shows mode selector when showPanel is true", () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        onModeChange={onModeChangeMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.querySelector("[data-testid='mode-select']")).toBeTruthy();
  });

  it("changes replication mode successfully", async () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        onModeChange={onModeChangeMock}
        permissions={{ fullAccess: true }}
      />,
    );

    // Open the mode dropdown
    const trigger = container
      .querySelector("[data-testid='mode-select']")
      ?.querySelector("span");
    expect(trigger).toBeTruthy();
    await act(async () => {
      fireEvent.click(trigger!);
    });

    // Click the "Pause" menu item (dropdown renders in portal)
    await waitFor(() => {
      const item = Array.from(
        document.querySelectorAll(".ant-dropdown-menu-item"),
      ).find((el) => el.textContent?.includes("Pause"));
      expect(item).toBeTruthy();
    });

    const item = Array.from(
      document.querySelectorAll(".ant-dropdown-menu-item"),
    ).find((el) => el.textContent?.includes("Pause"));
    await act(async () => {
      fireEvent.click(item!);
    });

    expect(clientMock.setReplicationMode).toHaveBeenCalledWith(
      replicationMock.info.name,
      ReplicationMode.PAUSED,
    );
    expect(onModeChangeMock).toHaveBeenCalledWith(
      replicationMock.info.name,
      ReplicationMode.PAUSED,
    );
  });

  it("handles mode change error gracefully", async () => {
    const errorMessage = "Failed to change mode";
    clientMock.setReplicationMode = vi
      .fn()
      .mockRejectedValue(new APIError(errorMessage, 500));

    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        onModeChange={onModeChangeMock}
        permissions={{ fullAccess: true }}
      />,
    );

    // Open the mode dropdown
    const trigger = container
      .querySelector("[data-testid='mode-select']")
      ?.querySelector("span");
    expect(trigger).toBeTruthy();
    await act(async () => {
      fireEvent.click(trigger!);
    });

    // Click the "Disable" menu item (dropdown renders in portal)
    await waitFor(() => {
      const item = Array.from(
        document.querySelectorAll(".ant-dropdown-menu-item"),
      ).find((el) => el.textContent?.includes("Disable"));
      expect(item).toBeTruthy();
    });

    const disableItem = Array.from(
      document.querySelectorAll(".ant-dropdown-menu-item"),
    ).find((el) => el.textContent?.includes("Disable"));
    await act(async () => {
      fireEvent.click(disableItem!);
    });

    expect(clientMock.setReplicationMode).toHaveBeenCalledWith(
      replicationMock.info.name,
      ReplicationMode.DISABLED,
    );
    expect(onModeChangeMock).not.toHaveBeenCalled();
  });

  it("enables mode selector for provisioned replications with fullAccess", () => {
    const provisionedReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        isProvisioned: true,
      },
    };

    const { container } = render(
      <ReplicationCard
        replication={provisionedReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        onModeChange={onModeChangeMock}
        permissions={{ fullAccess: true }}
      />,
    );

    const trigger = container
      .querySelector("[data-testid='mode-select']")
      ?.querySelector("span") as HTMLElement;
    expect(trigger.style.cursor).toBe("pointer");
  });

  it("disables mode selector when user does not have fullAccess", () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={true}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        onModeChange={onModeChangeMock}
        permissions={{ fullAccess: false }}
      />,
    );

    const trigger = container
      .querySelector("[data-testid='mode-select']")
      ?.querySelector("span") as HTMLElement;
    expect(trigger.style.cursor).toBe("not-allowed");
  });

  it("shows Running status when active", () => {
    const { container } = render(
      <ReplicationCard
        replication={replicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={false}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.querySelector("[data-testid='mode-select']")).toBeFalsy();
    expect(container.textContent).toContain("Running");
  });

  it("shows Disabled status when mode is disabled", () => {
    const disabledReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        mode: ReplicationMode.DISABLED,
      },
    };

    const { container } = render(
      <ReplicationCard
        replication={disabledReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={false}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.textContent).toContain("Disabled");
    expect(container.textContent).not.toContain("Running");
  });

  it("shows Target Unreachable status when enabled but not active", () => {
    const inactiveReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        isActive: false,
      },
    };

    const { container } = render(
      <ReplicationCard
        replication={inactiveReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={false}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.textContent).toContain("Target Unreachable");
  });

  it("shows Paused status when mode is paused", () => {
    const pausedReplicationMock: FullReplicationInfo = {
      ...replicationMock,
      info: {
        ...replicationMock.info,
        mode: ReplicationMode.PAUSED,
      },
    };

    const { container } = render(
      <ReplicationCard
        replication={pausedReplicationMock}
        client={clientMock}
        index={0}
        sourceBuckets={["sourceBucket1", "sourceBucket2"]}
        showPanel={false}
        onRemove={onRemoveMock}
        onShow={onShowMock}
        permissions={{ fullAccess: true }}
      />,
    );

    expect(container.textContent).toContain("Paused");
  });
});
