import React from "react";
import { mount } from "enzyme";
import waitUntil from "async-wait-until";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import BucketList from "./BucketList";
import { BucketInfo, Client } from "reduct-js";
import { MemoryRouter } from "react-router-dom";

describe("BucketList", () => {
  const client = new Client("");

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    client.getBucketList = jest.fn().mockResolvedValue([
      {
        name: "BucketWithData",
        entryCount: 2n,
        size: 10220n,
        oldestRecord: 0n,
        latestRecord: 10000n,
        isProvisioned: true,
      } as BucketInfo,
      {
        name: "EmptyBucket",
        entryCount: 0n,
        size: 0n,
        oldestRecord: 0n,
        latestRecord: 0n,
      } as BucketInfo,
    ]);
  });

  it("should print table with information about buckets", async () => {
    const panel = mount(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitUntil(() => panel.update().find(".ant-table-row").length > 0);

    const rows = panel.find(".ant-table-row");
    expect(rows.length).toEqual(2);
    expect(rows.at(0).render().text()).toEqual(
      "BucketWithData210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.010ZProvisioned",
    );
    expect(rows.at(1).render().text()).toEqual("EmptyBucket00 B---------");
  });

  it("should add a new bucket", async () => {
    const panel = mount(
      <MemoryRouter>
        <BucketList client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
    const button = await waitUntilFind(panel, { title: "Add" });
    expect(button).toBeDefined();

    // TODO: How to test modal?
  });

  it("should hide button to add a new bucket if user has no permissions", async () => {
    const panel = mount(
      <MemoryRouter>
        <BucketList client={client} permissions={{ fullAccess: false }} />
      </MemoryRouter>,
    );
    const button = await waitUntilFind(panel, { title: "Add" });
    expect(button).toBeUndefined();
  });
});
