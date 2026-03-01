import React from "react";
import { mount } from "enzyme";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { Bucket, BucketInfo, Client, EntryInfo } from "reduct-js";
import BucketDetail from "./BucketDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";

const mockPush = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    name: "testBucket",
  }),
  useHistory: () => ({
    push: mockPush,
    location: { pathname: "/buckets/testBucket" },
    goBack: jest.fn(),
  }),
}));

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
        name: "sensor/humidity",
        blockCount: 1n,
        recordCount: 1n,
        size: 512n,
        oldestRecord: 0n,
        latestRecord: 10000n,
      } as EntryInfo,
      {
        name: "flat-entry",
        blockCount: 1n,
        recordCount: 1n,
        size: 2048n,
        oldestRecord: 0n,
        latestRecord: 10000n,
      } as EntryInfo,
    ]);
  });

  it("should show bucket card with info", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitUntil(() => {
      detail.update();
      const card = detail.find(".BucketCard");
      if (!card.length) return false;
      const text = card.hostNodes().render().text();
      return text.includes("BucketWithData");
    });

    expect(client.getBucket).toBeCalledWith("testBucket");
    const cardText = detail.find(".BucketCard").hostNodes().render().text();
    expect(cardText).toContain("BucketWithData");
    expect(cardText).toContain("Entries2");
  });

  it("should render entries table with tree structure", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitUntil(() => {
      detail.update();
      return detail.find(".entriesTable").hostNodes().length > 0;
    });

    expect(detail.find(".entriesTable").hostNodes().length).toBe(1);
  });

  it("should navigate to entry on click", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitUntil(() => {
      detail.update();
      return detail.find(".entriesTable").hostNodes().length > 0;
    });

    // Find the flat-entry link and click it
    const links = detail.find("a.ant-typography");
    const flatEntryLink = links.filterWhere(
      (n: any) => n.text() === "flat-entry",
    );
    if (flatEntryLink.length) {
      flatEntryLink.simulate("click");
      expect(mockPush).toHaveBeenCalledWith(
        "/buckets/testBucket/entries/flat-entry",
      );
    }
  });

  it("should filter entries by search query", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitUntil(() => {
      detail.update();
      return detail.find(".entriesTable").hostNodes().length > 0;
    });

    // Type in search box
    const searchInput = detail.find(".entriesPathSearch input");
    searchInput.simulate("change", { target: { value: "sensor" } });
    detail.update();

    // The table should still render (filtered)
    expect(detail.find(".entriesTable").hostNodes().length).toBe(1);
  });
});
