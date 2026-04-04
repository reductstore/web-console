import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import BucketList from "./BucketList";
import { BucketInfo, Client, Status } from "reduct-js";
import { MemoryRouter } from "react-router-dom";
import { act } from "react";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe("BucketList", () => {
  const client = new Client("");

  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();
    client.getBucketList = vi.fn().mockResolvedValue([
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
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );

    const rows = container.querySelectorAll(".ant-table-row");
    expect(rows.length).toEqual(2);
    expect(rows[0].textContent).toEqual(
      "BucketWithData210 KB0 seconds1970-01-01T00:00:00.000Z1970-01-01T00:00:00.010ZProvisioned",
    );
    expect(rows[1].textContent).toEqual("EmptyBucket00 B---------");
  });

  it("should add a new bucket", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} permissions={{ fullAccess: true }} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(container.querySelector('[title="Add"]')).not.toBeNull(),
    );
    const button = container.querySelector('[title="Add"]');
    expect(button).not.toBeNull();

    // TODO: How to test modal?
  });

  it("should hide button to add a new bucket if user has no permissions", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} permissions={{ fullAccess: false }} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );
    const button = container.querySelector('[title="Add"]');
    expect(button).toBeNull();
  });

  it("should display rename and remove icons for non-provisioned buckets", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );

    const [, emptyBucketRow] = container.querySelectorAll(".ant-table-row");

    const renameIcon = emptyBucketRow.querySelector('span[title="Rename"]');
    const removeIcon = emptyBucketRow.querySelector('span[title="Remove"]');

    expect(renameIcon).not.toBeNull();
    expect(removeIcon).not.toBeNull();
  });

  it("should not display rename and remove icons for provisioned buckets", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );

    const [provisionedBucketRow] = container.querySelectorAll(".ant-table-row");

    const renameIcon = provisionedBucketRow.querySelector(
      'span[title="Rename"]',
    );
    const removeIcon = provisionedBucketRow.querySelector(
      'span[title="Remove"]',
    );

    expect(renameIcon).toBeNull();
    expect(removeIcon).toBeNull();
  });

  it("should open rename modal on rename icon click", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );

    const [, emptyBucketRow] = container.querySelectorAll(".ant-table-row");

    const renameIcon = emptyBucketRow.querySelector('span[title="Rename"]');
    fireEvent.click(renameIcon!);

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="rename-modal"]'),
      ).not.toBeNull(),
    );
    const removeModal = document.querySelector('[data-testid="delete-modal"]');

    expect(removeModal).toBeNull();
  });

  it("should open remove confirmation modal on remove icon click", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );

    const [, emptyBucketRow] = container.querySelectorAll(".ant-table-row");

    const removeIcon = emptyBucketRow.querySelector('span[title="Remove"]');
    fireEvent.click(removeIcon!);

    await waitFor(() =>
      expect(
        document.querySelector('[data-testid="delete-modal"]'),
      ).not.toBeNull(),
    );
    const renameModal = document.querySelector('[data-testid="rename-modal"]');

    expect(renameModal).toBeNull();
  });

  it("should show deleting state and disable actions for deleting bucket", async () => {
    client.getBucketList = vi.fn().mockResolvedValue([
      {
        name: "DeletingBucket",
        entryCount: 0n,
        size: 0n,
        oldestRecord: 0n,
        latestRecord: 0n,
        isProvisioned: false,
        status: Status.DELETING,
      } as BucketInfo,
    ]);

    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        container.querySelectorAll(".ant-table-row").length,
      ).toBeGreaterThan(0),
    );
    const [row] = container.querySelectorAll(".ant-table-row");
    expect(row.textContent).toContain("Deleting");

    const renameIcon = row.querySelector('span[title="Rename"]');
    const removeIcon = row.querySelector('span[title="Remove"]');
    expect(renameIcon?.getAttribute("onclick")).toBeNull();
    expect(removeIcon?.getAttribute("onclick")).toBeNull();
  });

  it("should show loading state while fetching buckets", async () => {
    let resolveGetBuckets: (value: BucketInfo[]) => void;
    const getBucketsPromise = new Promise<BucketInfo[]>((resolve) => {
      resolveGetBuckets = resolve;
    });

    client.getBucketList = vi.fn().mockReturnValue(getBucketsPromise);

    const { container } = render(
      <MemoryRouter>
        <BucketList client={client} />
      </MemoryRouter>,
    );

    expect(container.querySelector(".ant-spin-spinning")).not.toBeNull();

    await act(async () => {
      resolveGetBuckets([
        {
          name: "BucketWithData",
          entryCount: 2n,
          size: 10220n,
          oldestRecord: 0n,
          latestRecord: 10000n,
          isProvisioned: true,
        } as BucketInfo,
      ]);
    });

    expect(container.querySelector(".ant-spin-spinning")).toBeNull();
  });
});
