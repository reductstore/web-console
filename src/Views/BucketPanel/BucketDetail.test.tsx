import React from "react";
import { mount } from "enzyme";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { Bucket, BucketInfo, Client, EntryInfo } from "reduct-js";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // use actual for all non-hook parts
  useParams: () => ({
    name: "testBucket",
  }),
}));

import BucketDetail from "./BucketDetail";

describe("BucketDetail", () => {
  const client = new Client("");
  const bucket = {} as Bucket;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    client.getBucket = jest.fn().mockResolvedValue(bucket);

    bucket.getInfo = jest.fn().mockResolvedValue({
      name: "BucketWithData",
      entryCount: 2n,
      size: 10220n,
      oldestRecord: 0n,
      latestRecord: 10000n,
    } as BucketInfo);

    bucket.getEntryList = jest.fn().mockResolvedValue([
      {
        name: "EntryWithData",
        blockCount: 2n,
        recordCount: 100n,
        size: 10220n,
        oldestRecord: 0n,
        latestRecord: 10000n,
      } as EntryInfo,
      {
        name: "EmptyEntry",
        blockCount: 0n,
        recordCount: 0n,
        size: 0n,
        oldestRecord: 0n,
        latestRecord: 10000n,
      } as EntryInfo,
    ]);
  });

  it("should show bucket card ", async () => {
    const detail = mount(<BucketDetail client={client} />);
    const card = await waitUntilFind(detail, ".BucketCard");

    expect(client.getBucket).toBeCalledWith("testBucket");
    expect(card.hostNodes().render().text()).toEqual(
      "BucketWithDataSize10 KBEntries2History0 seconds",
    );
  });

  it("should show entry table ", async () => {
    const detail = mount(<BucketDetail client={client} />);
    const rows = await waitUntilFind(detail, ".ant-table-row");

    expect(rows.length).toEqual(2);
    expect(rows.at(0).render().text()).toEqual(
      "EntryWithData100210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.010Z",
    );
    expect(rows.at(1).render().text()).toEqual("EmptyEntry000 B---------");
  });

  it("should remove bucket and redirect", async () => {
    const detail = mount(
      <BucketDetail client={client} permissions={{ fullAccess: true }} />,
    );
    const removeButton = await waitUntilFind(detail, { title: "Remove" });

    removeButton.hostNodes().props().onClick();
    /* TODO: How to test modal window? */
  });

  it("should hide remove bucket button if no permissions", async () => {
    const detail = mount(
      <BucketDetail client={client} permissions={{ fullAccess: false }} />,
    );
    const removeButton = await waitUntilFind(detail, { title: "Remove" });

    expect(removeButton).toBeUndefined();
  });

  it("should remove entry and update table", async () => {
    const detail = mount(
      <BucketDetail
        client={client}
        permissions={{ fullAccess: false, write: ["BucketWithData"] }}
      />,
    );
    const removeButton = await waitUntilFind(detail, { title: "Remove entry" });

    expect(removeButton.hostNodes().length).toEqual(2);
    /* TODO: How to test modal window? */
  });

  it("should hide remove entry button if no permissions", async () => {
    const detail = mount(
      <BucketDetail client={client} permissions={{ fullAccess: false }} />,
    );
    const removeButton = await waitUntilFind(detail, { title: "Remove entry" });

    expect(removeButton).toBeUndefined();
  });
});
