import React from "react";
import type { Mocked } from "vitest";
import { Client, Token } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import TokenDetail from "./TokenDetail";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock ResizeObserver for antd components
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("TokenDetail", () => {
  const client = new Client("");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getToken = vi.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
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

    const input = await waitFor(() => {
      const el = container.querySelector('input[name="name"]');
      expect(el).not.toBeNull();
      return el as HTMLInputElement;
    });
    expect(input.value).toBe("token-1");
    expect(input.disabled).toBe(true);

    const fullAccess = container.querySelector(
      'input[name="fullAccess"]',
    ) as HTMLInputElement;
    expect(fullAccess.checked).toBe(true);
    expect(fullAccess.disabled).toBe(true);

    const readSelect = container.querySelector("#ReadSelect") as HTMLElement;
    expect(readSelect).not.toBeNull();
    expect(
      readSelect
        .closest(".ant-select")
        ?.classList.contains("ant-select-disabled"),
    ).toBe(true);

    const writeSelect = container.querySelector("#WriteSelect") as HTMLElement;
    expect(writeSelect).not.toBeNull();
    expect(
      writeSelect
        .closest(".ant-select")
        ?.classList.contains("ant-select-disabled"),
    ).toBe(true);
  });

  it("should show error", async () => {
    client.getToken = vi.fn().mockRejectedValue(new Error("error"));
    const { container } = renderTokenDetail();

    await waitFor(() => {
      const alert = container.querySelector(".Alert");
      expect(alert).not.toBeNull();
      expect(alert!.textContent).toBe("error");
    });
  });

  it("should show remove confirmation modal", async () => {
    client.deleteToken = vi.fn().mockResolvedValue(undefined);
    const { container } = renderTokenDetail();

    const removeButton = await waitFor(() => {
      const btn = container.querySelector(".RemoveButton") as HTMLButtonElement;
      expect(btn).not.toBeNull();
      return btn;
    });

    await act(async () => {
      fireEvent.click(removeButton);
    });

    expect(screen.getByText(/For confirmation type/)).toBeInTheDocument();
    expect(screen.getByText("token-1")).toBeInTheDocument();
  });

  it("should remove a token", async () => {
    const mockDeleteToken = vi.fn().mockResolvedValue(undefined);
    client.deleteToken = mockDeleteToken;

    const { container } = renderTokenDetail();

    const removeButton = await waitFor(() => {
      const btn = container.querySelector(".RemoveButton") as HTMLButtonElement;
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
      const btn = container.querySelector(".RemoveButton") as HTMLButtonElement;
      expect(btn).not.toBeNull();
      return btn;
    });
    expect(removeButton.disabled).toBeTruthy();
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
      const btn = container.querySelector(".CreateButton") as HTMLButtonElement;
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
