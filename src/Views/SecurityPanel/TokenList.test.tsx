import React from "react";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { Client, Token } from "reduct-js";
import { mount } from "enzyme";
import TokenList from "./TokenList";
import { MemoryRouter } from "react-router-dom";

describe("TokenList", () => {
  const client = new Client("");

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    client.getTokenList = jest
      .fn()
      .mockResolvedValue([
        { name: "token-1", createdAt: 100000, isProvisioned: true } as Token,
        { name: "token-2", createdAt: 200000 } as Token,
      ]);
  });

  it("should print table with tokens", async () => {
    const panel = mount(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );
    const rows = await waitUntilFind(panel, ".ant-table-row");

    expect(rows.length).toEqual(2);
    expect(rows.at(0).render().text()).toEqual(
      "token-11970-01-01T00:01:40.000ZProvisioned",
    );
    expect(rows.at(1).render().text()).toEqual(
      "token-21970-01-01T00:03:20.000Z",
    );
  });

  it("should have a button to create a new token", async () => {
    const panel = mount(
      <MemoryRouter>
        <TokenList client={client} />
      </MemoryRouter>,
    );
    const button = await waitUntilFind(panel, { title: "Add" });

    button.hostNodes().props().onClick();

    // No idea how to mock history and use MemoryRouter in the same test
  });
});
