import React from "react";
import { mount } from "enzyme";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { Bucket, BucketInfo, Client, EntryInfo } from "reduct-js";
import BucketDetail from "./BucketDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";
import { act } from "react-dom/test-utils";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"), // use actual for all non-hook parts
  useParams: () => ({
    name: "testBucket",
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

    bucket.renameEntry = jest.fn(); // Mock renameEntry method
  });

  it("should show bucket card ", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );
    const card = await waitUntilFind(detail, ".BucketCard");

    expect(client.getBucket).toBeCalledWith("testBucket");
    expect(card.hostNodes().render().text()).toEqual(
      "BucketWithDataSize10 KBEntries2History0 seconds",
    );
  });

  it("should show entry table ", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );
    const rows = await waitUntilFind(detail, ".ant-table-row");

    expect(rows.length).toEqual(2);
    expect(rows.at(0).render().text()).toEqual(
      "EntryWithData100210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.010Z",
    );
    expect(rows.at(1).render().text()).toEqual("EmptyEntry000 B---------");
  });

  it("should remove bucket and redirect", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} permissions={{ fullAccess: true }} />,
      </MemoryRouter>,
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
      <MemoryRouter>
        <BucketDetail
          client={client}
          permissions={{ fullAccess: false, write: ["BucketWithData"] }}
        />
      </MemoryRouter>,
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

  it("should display rename icon for entries", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail
          client={client}
          permissions={{ fullAccess: false, write: ["BucketWithData"] }}
        />
        ,
      </MemoryRouter>,
    );
    const renameIcon = await waitUntilFind(detail, { title: "Rename entry" });

    expect(renameIcon.hostNodes().length).toEqual(2);
  });

  it("should hide rename icon for entries if no permissions", async () => {
    const detail = mount(
      <BucketDetail client={client} permissions={{ fullAccess: false }} />,
    );
    const renameIcon = await waitUntilFind(detail, { title: "Rename entry" });

    expect(renameIcon).toBeUndefined();
  });

  it("should open rename modal on rename icon click", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
    await waitUntil(() => detail.update().find(".ant-table-row").length > 0);

    const rows = detail.find(".ant-table-row");
    const emptyEntryRow = rows.at(1);

    const renameIcon = emptyEntryRow.find('span[title="Rename entry"]');
    renameIcon.simulate("click");

    const renameModal = detail.find('div[data-testid="rename-modal"]');
    const removeModal = detail.find('div[data-testid="delete-modal"]');

    expect(renameModal.exists()).toBe(true);
    expect(removeModal.exists()).toBe(false);
  });

  it("should rename the entry on modal submit", async () => {
    const detail = mount(
      <MemoryRouter>
        <BucketDetail client={client} permissions={{ fullAccess: true }} />,
      </MemoryRouter>,
    );
    await waitUntil(() => detail.update().find(".ant-table-row").length > 0);

    const rows = detail.find(".ant-table-row");
    const emptyEntryRow = rows.at(1);

    const renameIcon = emptyEntryRow.find('span[title="Rename entry"]');
    renameIcon.simulate("click");

    const renameModal = detail.find('div[data-testid="rename-modal"]');
    expect(renameModal.exists()).toBe(true);

    const input = renameModal.find('input[data-testid="rename-input"]');
    act(() => {
      input.simulate("change", { target: { value: "NewEntryName" } });
    });

    const inputValue = input.getDOMNode()?.getAttribute("value");
    expect(inputValue).toEqual("NewEntryName");

    const submitButton = renameModal.find("button").at(1);
    submitButton.simulate("click");

    await waitUntil(() => detail.update().find(".ant-table-row").length > 0);
    expect(bucket.renameEntry).toBeCalledWith("EmptyEntry", "NewEntryName");
  });
});
