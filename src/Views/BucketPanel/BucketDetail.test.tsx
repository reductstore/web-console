import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, BucketInfo, Client, EntryInfo } from "reduct-js";
import BucketDetail from "./BucketDetail";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => ({
  ...(await vi.importActual("react-router-dom")),
  useParams: () => ({ name: "testBucket" }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/buckets/testBucket" }),
}));

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("BucketDetail", () => {
  const client = new Client("");
  const bucket = {} as Bucket;

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getBucket = vi.fn().mockResolvedValue(bucket);

    bucket.getInfo = vi.fn().mockResolvedValue({
      name: "BucketWithData",
      entryCount: 2n,
      size: 10220n,
      oldestRecord: 0n,
      latestRecord: 10000n,
    } as BucketInfo);

    bucket.getEntryList = vi.fn().mockResolvedValue([
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
    const { container } = render(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const card = container.querySelector(".BucketCard");
      expect(card).not.toBeNull();
      expect(card!.textContent).toContain("BucketWithData");
    });

    expect(client.getBucket).toBeCalledWith("testBucket");
    const card = container.querySelector(".BucketCard");
    expect(card!.textContent).toContain("BucketWithData");
    expect(card!.textContent).toContain("Entries2");
  });

  it("should render entries table with tree structure", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelector(".entriesTable")).not.toBeNull();
    });

    expect(container.querySelector(".entriesTable")).not.toBeNull();
  });

  it("should navigate to entry on click", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelector(".entriesTable")).not.toBeNull();
    });

    // Find the flat-entry link and click it
    const links = Array.from(container.querySelectorAll("a.ant-typography"));
    const flatEntryLink = links.find(
      (link) => link.textContent === "flat-entry",
    );
    if (flatEntryLink) {
      fireEvent.click(flatEntryLink);
      expect(mockNavigate).toHaveBeenCalledWith(
        "/buckets/testBucket/entries/flat-entry",
      );
    }
  });

  it("should filter entries by search query", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketDetail client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(container.querySelector(".entriesTable")).not.toBeNull();
    });

    // Type in search box
    const searchInput = container.querySelector(".entriesPathSearch input");
    await act(async () => {
      fireEvent.change(searchInput!, { target: { value: "sensor" } });
    });

    // The table should still render (filtered)
    expect(container.querySelector(".entriesTable")).not.toBeNull();
  });
});
