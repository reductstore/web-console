import React from "react";
import { Client, Token } from "reduct-js";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { mount } from "enzyme";
import TokenDetail from "./TokenDetail";
import { MemoryRouter, Route } from "react-router-dom";
import { act } from "react-dom/test-utils";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    name: "token-1",
  }),
}));

describe("TokenDetail", () => {
  const client = new Client("");

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    client.getToken = jest.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      permissions: {
        fullAccess: true,
        read: ["bucket-1"],
        write: ["bucket-2"],
      },
    } as Token);
  });

  it("should show token details", async () => {
    const view = mount(
      <MemoryRouter initialEntries={["/tokens/new_token"]}>
        <Route path="/tokens/:name">
          <TokenDetail client={client} />
        </Route>
      </MemoryRouter>,
    );

    const input = await waitUntilFind(view, { name: "name" });
    expect(input.hostNodes().props().value).toBe("token-1");
    expect(input.hostNodes().props().disabled).toBe(true);

    const fullAccess = await waitUntilFind(view, { name: "fullAccess" });
    expect(fullAccess.hostNodes().props().checked).toBe(true);
    expect(fullAccess.hostNodes().props().disabled).toBe(true);

    const read = await waitUntilFind(view, { id: "ReadSelect" });
    expect(read.at(1).props().value).toEqual(["bucket-1"]);
    expect(read.hostNodes().props().disabled).toBe(true);

    const write = await waitUntilFind(view, { id: "WriteSelect" });
    expect(write.at(1).props().value).toEqual(["bucket-2"]);
    expect(write.hostNodes().props().disabled).toBe(true);
  });

  it("should show error", async () => {
    client.getToken = jest.fn().mockRejectedValue(new Error("error"));
    const view = mount(
      <MemoryRouter initialEntries={["/tokens/new_token"]}>
        <Route path="/tokens/:name">
          <TokenDetail client={client} />
        </Route>
      </MemoryRouter>,
    );

    const error = await waitUntilFind(view, ".Alert");
    expect(error.hostNodes().text()).toBe("error");
  });

  it("should show remove confirmation modal", async () => {
    client.deleteToken = jest.fn().mockResolvedValue(undefined);
    const view = mount(
      <MemoryRouter initialEntries={["/tokens/new_token"]}>
        <Route path="/tokens/:name">
          <TokenDetail client={client} />
        </Route>
      </MemoryRouter>,
    );

    const removeButton = await waitUntilFind(view, ".RemoveButton");
    await act(async () => {
      removeButton.hostNodes().props().onClick();
    });
    view.update();

    const confirmationText = view
      .find("p")
      .filterWhere((n) => n.text().includes("For confirmation type"));

    expect(confirmationText.exists()).toBe(true);
    expect(confirmationText.text()).toBe("For confirmation type token-1");
  });

  it("should disable remove button if provisioned", async () => {
    client.getToken = jest.fn().mockResolvedValue({
      name: "token-1",
      createdAt: 100000,
      isProvisioned: true,
    } as Token);
    const view = mount(
      <MemoryRouter initialEntries={["/tokens/new_token"]}>
        <Route path="/tokens/:name">
          <TokenDetail client={client} />
        </Route>
      </MemoryRouter>,
    );

    const removeButton = await waitUntilFind(view, ".RemoveButton");
    expect(removeButton.hostNodes().props().disabled).toBeTruthy();
  });

  it("shows error if clipboard copy fails", async () => {
    const mockClipboard = {
      writeText: jest.fn().mockRejectedValue(new Error("Clipboard error")),
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    const client = new Client("") as jest.Mocked<Client>;
    client.getBucketList = jest
      .fn()
      .mockResolvedValue([{ name: "bucket-1" }, { name: "bucket-2" }]);
    client.createToken = jest.fn().mockResolvedValue("mock-token-value");

    const view = mount(
      <MemoryRouter initialEntries={["/tokens/new_token?isNew=true"]}>
        <Route path="/tokens/:name">
          <TokenDetail client={client} />
        </Route>
      </MemoryRouter>,
    );

    const createButton = await waitUntilFind(view, ".CreateButton");

    await act(async () => {
      createButton.hostNodes().props().onClick();
    });
    view.update();

    const modalButton = view
      .find("button")
      .filterWhere((n) => n.text().includes("Copy To Clipboard And Close"));

    expect(modalButton.exists()).toBe(true);

    await act(async () => {
      (modalButton as any).hostNodes().props().onClick();
    });
    view.update();
    const error = await waitUntilFind(view, ".Alert");
    expect(error.hostNodes().text()).toBe(
      "Failed to copy token to clipboard. Please copy it manually.",
    );
  });
});
