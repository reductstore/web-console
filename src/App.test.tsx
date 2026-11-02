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

  const renderLoggedOutApp = async () => {
    backendAPI.isAllowed = vi.fn().mockResolvedValue(false);

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
      expect(backendAPI.isAllowed).toHaveBeenCalled();
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

  it("shows only the login view while logged out", async () => {
    await renderLoggedOutApp();

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Console menu" }),
    ).not.toBeInTheDocument();
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

  it("highlights the Security menu item on the token routes", async () => {
    backendAPI.isAllowed = vi.fn().mockResolvedValue(true);
    backendAPI.me = vi.fn().mockResolvedValue({
      name: "demo-token",
      permissions: { fullAccess: true },
    } as Token);

    render(
      <MemoryRouter initialEntries={["/tokens"]}>
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

    const selected = screen
      .getByText("Security")
      .closest(".ant-menu-item-selected");
    expect(selected).not.toBeNull();
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

  it("shows documentation resources and version in the About menu", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(screen.getByRole("button", { name: "About menu" }));

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
    expect(screen.getByText("Web Console vdevelopment")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Web Console vdevelopment" }),
    ).not.toBeInTheDocument();
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

  it("shows the About name when its collapsed control is hovered", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );
    fireEvent.mouseEnter(screen.getByRole("button", { name: "About menu" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("About");
  });

  it("shows the signed-in token and sign-out outside the About menu", async () => {
    await renderApp({ fullAccess: false });

    expect(screen.getByText("demo-token")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "About menu" }));

    expect(
      screen.queryByRole("menuitem", { name: "demo-token" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Sign out" }),
    ).not.toBeInTheDocument();
  });

  it("signs out from the direct sidebar control", async () => {
    await renderApp({ fullAccess: false });

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(backendAPI.logout).toHaveBeenCalledOnce();
  });

  it("shows the account social links in the footer", async () => {
    await renderApp({ fullAccess: false });

    expect(screen.getByRole("link", { name: "Discourse" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YouTube" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
  });
});
