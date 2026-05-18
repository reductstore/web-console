import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";

import { Client, LifecycleMode } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import Lifecycles from "./Lifecycles";

describe("Lifecycles", () => {
  const client = new Client("dummyURL");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getLifecycleList = vi.fn().mockResolvedValue([
      {
        name: "Lifecycle1",
        mode: LifecycleMode.ENABLED,
        isRunning: true,
        isProvisioned: false,
      },
      {
        name: "Lifecycle2",
        mode: LifecycleMode.DISABLED,
        isRunning: false,
        isProvisioned: true,
      },
    ]);
    client.getBucketList = vi.fn().mockResolvedValue([]);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <Lifecycles client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
  };

  it("renders without crashing", () => {
    const { container } = renderComponent();
    expect(container.querySelector(".ant-table")).toBeTruthy();
  });

  it("fetches and displays lifecycle data correctly", async () => {
    const { container } = renderComponent();
    await waitFor(() => {
      expect(
        container.querySelectorAll("tr.ant-table-row").length,
      ).toBeGreaterThanOrEqual(2);
    });

    const rows = container.querySelectorAll("tr.ant-table-row");
    expect(rows.length).toEqual(2);
    expect(rows[0].querySelector("a")!.textContent).toEqual("Lifecycle1");
    expect(rows[1].querySelector("a")!.textContent).toEqual("Lifecycle2");
  });

  it("opens create lifecycle modal", async () => {
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
      expect(document.querySelector("#lifecycleForm")).toBeTruthy();
    });
    expect(document.querySelector(".ant-modal")).toBeTruthy();
  });

  it("does not show create button without full access", () => {
    const { container } = render(
      <MemoryRouter>
        <Lifecycles client={client} permissions={{ fullAccess: false }} />
      </MemoryRouter>,
    );

    expect(container.querySelector("button")).toBeFalsy();
  });
});
