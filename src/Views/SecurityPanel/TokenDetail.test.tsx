import React from "react";
import type { Mocked } from "vitest";
import { Client, Token } from "reduct-js";
import { message } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  within,
} from "@testing-library/react";
import TokenDetail from "./TokenDetail";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock ResizeObserver for antd components
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("TokenDetail", () => {
  const client = new Client("");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    message.error = vi.fn();

    client.getToken = vi.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      isExpired: false,
      expiresAt: 9999999999000,
      ttl: 3600,
      lastAccess: 500000,
      ipAllowlist: ["10.0.0.0/8"],
      permissions: {
        fullAccess: true,
        read: ["bucket-1"],
        write: ["bucket-2"],
      },
    } as Token);
  });

  const renderTokenDetail = (initialEntry = "/tokens/token-1") => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/tokens/:name"
            element={<TokenDetail client={client} />}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it("should show token details", async () => {
    const { container } = renderTokenDetail();

    await waitFor(() => {
      expect(screen.getByText("Access Token")).toBeInTheDocument();
      expect(screen.getByText("token-1")).toBeInTheDocument();
    });
    const input = container.querySelector('input[name="name"]');
    expect(input).toBeNull();
    expect(screen.getByText("Full Access")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("Read Access")).toBeInTheDocument();
    expect(screen.getByText("bucket-1")).toBeInTheDocument();
    expect(screen.getByText("Write Access")).toBeInTheDocument();
    expect(screen.getByText("bucket-2")).toBeInTheDocument();
  });

  it("should show error", async () => {
    client.getToken = vi.fn().mockRejectedValue(new Error("error"));
    renderTokenDetail();

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith("error");
    });
  });

  it("should show remove confirmation modal", async () => {
    client.deleteToken = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTokenDetail();

    const removeButton = await waitFor(() => {
      const btn = container.querySelector(".RemoveButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(removeButton);
    });

    const modal = screen.getByTestId("remove-token-modal");
    expect(
      within(modal).getByText(/For confirmation type/),
    ).toBeInTheDocument();
    expect(within(modal).getByText("token-1")).toBeInTheDocument();
  });

  it("should remove a token", async () => {
    const mockDeleteToken = vi.fn().mockResolvedValue(undefined);
    client.deleteToken = mockDeleteToken;

    const { container } = renderTokenDetail();

    const removeButton = await waitFor(() => {
      const btn = container.querySelector(".RemoveButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(removeButton);
    });

    const confirmInput = screen.getByTestId("remove-confirm-input");
    expect(confirmInput).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(confirmInput, { target: { value: "token-1" } });
    });

    const okButton = screen.getByRole("button", { name: /Remove Token/i });
    expect(okButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(okButton);
    });

    expect(mockDeleteToken).toHaveBeenCalledWith("token-1");
  });

  it("should disable remove button if provisioned", async () => {
    client.getToken = vi.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      isProvisioned: true,
    } as Token);
    const { container } = renderTokenDetail();

    const removeButton = await waitFor(() => {
      const btn = container.querySelector(".RemoveButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });
    expect(removeButton.dataset.disabled).toBe("true");
  });

  it("should disable rotate button if provisioned", async () => {
    client.getToken = vi.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      isProvisioned: true,
    } as Token);
    const { container } = renderTokenDetail();

    const rotateButton = await waitFor(() => {
      const btn = container.querySelector(".RotateButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });
    expect(rotateButton.dataset.disabled).toBe("true");
  });

  it("should show token metadata in view mode", async () => {
    renderTokenDetail();

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.getByText("Provisioned")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.getByText("1 hour")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.0/8")).toBeInTheDocument();
  });

  it("should show expired status", async () => {
    client.getToken = vi.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      isExpired: true,
      permissions: {
        fullAccess: false,
        read: [],
        write: [],
      },
    } as Token);
    renderTokenDetail();

    await waitFor(() => {
      expect(screen.getByText("Expired")).toBeInTheDocument();
    });
  });

  it("should rotate a token", async () => {
    const mockRotateToken = vi
      .fn()
      .mockResolvedValue("new-rotated-token-value");
    client.rotateToken = mockRotateToken;

    const { container } = renderTokenDetail();

    const rotateButton = await waitFor(() => {
      const btn = container.querySelector(".RotateButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(rotateButton);
    });

    await waitFor(() => {
      expect(mockRotateToken).toHaveBeenCalledWith("token-1");
    });

    expect(
      screen.getByRole("button", { name: /Copy To Clipboard And Close/i }),
    ).toBeInTheDocument();
  });

  it("should create token with v2 fields", async () => {
    const mockCreateToken = vi.fn().mockResolvedValue("new-token-value");
    const client = new Client("") as Mocked<Client>;
    client.getBucketList = vi
      .fn()
      .mockResolvedValue([{ name: "bucket-1" }, { name: "bucket-2" }]);
    client.createToken = mockCreateToken;

    const { container } = render(
      <MemoryRouter initialEntries={["/tokens/new_token?isNew=true"]}>
        <Routes>
          <Route
            path="/tokens/:name"
            element={<TokenDetail client={client} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const createButton = await waitFor(() => {
      const btn = container.querySelector(".CreateButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(createButton);
    });

    expect(mockCreateToken).toHaveBeenCalledWith(
      "new_token",
      expect.objectContaining({
        permissions: expect.objectContaining({ fullAccess: false }),
      }),
    );
  });

  it("shows error if clipboard copy fails", async () => {
    const mockClipboard = {
      writeText: vi.fn().mockRejectedValue(new Error("Clipboard error")),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    const client = new Client("") as Mocked<Client>;
    client.getBucketList = vi
      .fn()
      .mockResolvedValue([{ name: "bucket-1" }, { name: "bucket-2" }]);
    client.createToken = vi.fn().mockResolvedValue("mock-token-value");

    const { container } = render(
      <MemoryRouter initialEntries={["/tokens/new_token?isNew=true"]}>
        <Routes>
          <Route
            path="/tokens/:name"
            element={<TokenDetail client={client} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const createButton = await waitFor(() => {
      const btn = container.querySelector(".CreateButton") as HTMLElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(createButton);
    });

    const modalButton = await waitFor(() => {
      const btn = screen.getByRole("button", {
        name: /Copy To Clipboard And Close/i,
      });
      expect(btn).toBeInTheDocument();
      return btn;
    });

    await act(async () => {
      fireEvent.click(modalButton);
    });

    await waitFor(() => {
      const alert = document.querySelector(".Alert");
      expect(alert).not.toBeNull();
      expect(alert!.textContent).toBe(
        "Failed to copy token to clipboard. Please copy it manually.",
      );
    });
  });
});
