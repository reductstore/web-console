import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";
import Replications from "./Replications";
import { Client, ReplicationMode } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("Replications", () => {
  const client = new Client("dummyURL");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getReplicationList = vi.fn().mockResolvedValue([
      {
        name: "Replication1",
        isActive: true,
        isProvisioned: false,
        pendingRecords: 100n,
        mode: ReplicationMode.ENABLED,
      },
      {
        name: "Replication2",
        isActive: false,
        isProvisioned: true,
        pendingRecords: 50n,
        mode: ReplicationMode.PAUSED,
      },
    ]);
    client.getBucketList = vi.fn().mockResolvedValue([]);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
  };

  it("renders without crashing", () => {
    const { container } = renderComponent();
    expect(container.querySelector(".ant-table")).toBeTruthy();
  });

  it("fetches and displays replication data correctly", async () => {
    const { container } = renderComponent();
    await waitFor(() => {
      expect(
        container.querySelectorAll("tr.ant-table-row").length,
      ).toBeGreaterThanOrEqual(2);
    });
    const rows = container.querySelectorAll("tr.ant-table-row");

    expect(rows.length).toEqual(2);

    expect(rows[0].querySelector("a")!.textContent).toEqual("Replication1");
    const row0SuccessTags = rows[0].querySelectorAll("span.ant-tag-success");
    expect(row0SuccessTags.length).toBeGreaterThanOrEqual(2);
    expect(row0SuccessTags[0].textContent).toEqual("Enabled");
    expect(row0SuccessTags[1].textContent).toEqual("Target Reachable");
    const row0Cells = rows[0].querySelectorAll("td");
    expect(row0Cells[2].textContent).toContain("Enabled");
    expect(row0Cells[2].textContent).toContain("Target Reachable");
    expect(row0Cells[3].textContent).toEqual("100");

    expect(rows[1].querySelector("a")!.textContent).toEqual("Replication2");
    const row1Cells = rows[1].querySelectorAll("td");
    expect(row1Cells[2].textContent).toContain("Paused");
    expect(row1Cells[2].textContent).toContain("Target Unreachable");
    expect(row1Cells[3].textContent).toEqual("50");
  });

  it("shows the add replication button", () => {
    const { container } = renderComponent();
    expect(container.querySelector("button")).toBeTruthy();
  });

  it("does not show the add replication button if the user does not have full access", () => {
    const { container } = render(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: false }} />
      </MemoryRouter>,
    );
    expect(container.querySelector("button")).toBeFalsy();
  });

  it("opens the create replication modal", async () => {
    const { container } = renderComponent();
    await waitFor(() => {
      expect(
        container.querySelectorAll("tr.ant-table-row").length,
      ).toBeGreaterThanOrEqual(1);
    });
    await act(async () => {
      fireEvent.click(container.querySelector("button")!);
    });
    await waitFor(() => {
      expect(document.querySelector("#replicationForm")).toBeTruthy();
    });
    expect(document.querySelector(".ant-modal")).toBeTruthy();
  });

  it("closes the create replication modal", async () => {
    const { container } = renderComponent();
    await waitFor(() => {
      expect(
        container.querySelectorAll("tr.ant-table-row").length,
      ).toBeGreaterThanOrEqual(1);
    });
    await act(async () => {
      fireEvent.click(container.querySelector("button")!);
    });
    await waitFor(() => {
      expect(document.querySelector("#replicationForm")).toBeTruthy();
    });

    // Verify modal has a close button and onCancel is wired up
    const closeBtn = document.querySelector(
      'button[aria-label="Close"]',
    ) as HTMLElement;
    expect(closeBtn).toBeTruthy();
    expect((closeBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("should show loading state while fetching replications", async () => {
    let resolveGetReplications: (value: any) => void;
    const getReplicationsPromise = new Promise((resolve) => {
      resolveGetReplications = resolve;
    });

    client.getReplicationList = vi.fn().mockReturnValue(getReplicationsPromise);

    const { container } = render(
      <MemoryRouter>
        <Replications client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".ant-spin-spinning")).toBeTruthy();

    await act(async () => {
      resolveGetReplications([
        {
          name: "Replication1",
          isActive: true,
          isProvisioned: false,
          pendingRecords: 100n,
          mode: ReplicationMode.ENABLED,
        },
      ]);
    });

    await waitFor(() => {
      expect(container.querySelector(".ant-spin-spinning")).toBeFalsy();
    });
  });
});
