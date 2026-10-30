import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    backendAPI.me = vi
      .fn()
      .mockResolvedValue({ name: "demo-token", permissions } as Token);

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

  it("should have a link to lifecycle panel", async () => {
    await renderApp({ fullAccess: true });
    expect(screen.getByText("Lifecycles")).toBeInTheDocument();
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

  it("should hide lifecycles panel", async () => {
    await renderApp({ fullAccess: false });
    expect(screen.queryByText("Lifecycles")).not.toBeInTheDocument();
  });

  it("shows documentation resources and version in the console menu", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(screen.getByRole("button", { name: "Console menu" }));

    expect(
      await screen.findByRole("link", { name: "Documentation" }),
    ).toHaveAttribute("href", "https://www.reduct.store/docs");
    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute(
      "href",
      "https://www.reduct.store/docs/guides",
    );
    expect(screen.getByRole("link", { name: "CLI" })).toHaveAttribute(
      "href",
      "https://github.com/reductstore/reduct-cli",
    );
    expect(
      screen.getByRole("link", { name: "Web Console vdevelopment" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/reductstore/web-console/releases/tag/vdevelopment",
    );
  });

  it("collapses and expands the navigation from its footer control", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );

    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
  });

  it("shows the signed-in token name in the console menu", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(screen.getByRole("button", { name: "Console menu" }));

    expect(await screen.findByText("demo-token")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("shows the account social links in the footer", async () => {
    await renderApp({ fullAccess: false });

    expect(screen.getByRole("link", { name: "Discourse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YouTube" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
