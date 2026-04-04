import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { mockJSDOM } from "./Helpers/TestHelpers";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { IBackendAPI } from "./BackendAPI";
import { Client, Token } from "reduct-js";

describe("App", () => {
  const client = new Client("");
  const backendAPI: IBackendAPI = {
    client: client,
    logout: vi.fn(),
    login: vi.fn(),
    isAllowed: vi.fn(),
    me: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
  });

  const renderApp = async (permissions: { fullAccess: boolean }) => {
    backendAPI.isAllowed = vi.fn().mockResolvedValue(true);
    backendAPI.me = vi.fn().mockResolvedValue({ permissions } as Token);

    const result = render(
      <MemoryRouter>
        <App
          backendApi={backendAPI}
          publicUrl="/ui"
          apiUrl="https://example.com"
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(backendAPI.me).toHaveBeenCalled();
    });

    return result;
  };

  it("should have a link to dashboard panel", async () => {
    await renderApp({ fullAccess: false });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should have a link to bucket panel", async () => {
    await renderApp({ fullAccess: false });
    expect(screen.getByText("Buckets")).toBeInTheDocument();
  });

  it("should have a link to replication panel", async () => {
    await renderApp({ fullAccess: true });
    expect(screen.getByText("Replications")).toBeInTheDocument();
  });

  it("should have a link to security panel", async () => {
    await renderApp({ fullAccess: true });
    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("should hide security panel", async () => {
    await renderApp({ fullAccess: false });
    expect(screen.queryByText("Security")).not.toBeInTheDocument();
  });

  it("should hide replications panel", async () => {
    await renderApp({ fullAccess: false });
    expect(screen.queryByText("Replications")).not.toBeInTheDocument();
  });

  it("should show help menu", async () => {
    const { container } = await renderApp({ fullAccess: false });
    expect(container.querySelector(".help-menu-item")).toBeInTheDocument();
  });
});
