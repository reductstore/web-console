import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Client, Token } from "reduct-js";
import TokenList from "./TokenList";
import { MemoryRouter } from "react-router-dom";

describe("TokenList", () => {
  const client = new Client("");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    client.getTokenList = vi.fn().mockResolvedValue([
      {
        name: "token-1",
        createdAt: 100000,
        isProvisioned: true,
        isExpired: false,
        expiresAt: 9999999999000,
        ttl: 3600,
        lastAccess: 500000,
        ipAllowlist: ["192.168.1.0/24"],
      } as Token,
      {
        name: "token-2",
        createdAt: 200000,
        isExpired: true,
      } as Token,
    ]);
  });

  it("should print table with tokens", async () => {
    render(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("token-1")).toBeInTheDocument();
    });
    expect(screen.getByText("token-2")).toBeInTheDocument();
    expect(screen.getByText("Provisioned")).toBeInTheDocument();
  });

  it("should show status tags", async () => {
    render(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("should show TTL, expiry, last access, and IP allowlist", async () => {
    render(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("192.168.1.0/24")).toBeInTheDocument();
    });
    expect(screen.getByText("1 hour")).toBeInTheDocument();
  });

  it("should have a button to create a new token", async () => {
    render(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTitle("Add")).toBeInTheDocument();
    });
  });

  it("should show loading state while fetching tokens", async () => {
    let resolveGetTokens: (value: Token[]) => void;
    const getTokensPromise = new Promise<Token[]>((resolve) => {
      resolveGetTokens = resolve;
    });

    client.getTokenList = vi.fn().mockReturnValue(getTokensPromise);

    const { container } = render(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".ant-spin-spinning")).toBeInTheDocument();

    resolveGetTokens!([
      { name: "token-1", createdAt: 100000, isProvisioned: true } as Token,
    ]);

    await waitFor(() => {
      expect(
        container.querySelector(".ant-spin-spinning"),
      ).not.toBeInTheDocument();
    });
  });
});
