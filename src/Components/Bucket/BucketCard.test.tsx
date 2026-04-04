import { mockJSDOM } from "../../Helpers/TestHelpers";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BucketCard from "./BucketCard";
import { BucketInfo, Client, Status } from "reduct-js";

describe("BucketCard", () => {
  beforeEach(() => mockJSDOM());

  const info: BucketInfo = {
    name: "bucket",
    entryCount: 5n,
    size: 50000n,
    oldestRecord: 0n,
    latestRecord: 1000000n,
    isProvisioned: false,
    status: Status.READY,
  };

  const client = new Client("");
  const onRemove = vi.fn();
  const onUpload = vi.fn();

  it("should call a callback when settings is pressed", async () => {
    const { container } = render(
      <MemoryRouter>
        <BucketCard
          bucketInfo={info}
          permissions={{ fullAccess: true }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
        />
      </MemoryRouter>,
    );
    let button: Element | null = null;
    await waitFor(() => {
      button = container.querySelector('[title="Settings"]');
      expect(button).toBeTruthy();
    });

    fireEvent.click(button!);
    /* TODO: How to test modal? */
  });

  it("should call a callback when remove is pressed", async () => {
    const { container } = render(
      <BucketCard
        bucketInfo={info}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    let button: Element | null = null;
    await waitFor(() => {
      button = container.querySelector('[title="Remove"]');
      expect(button).toBeTruthy();
    });

    fireEvent.click(button!);
    /* TODO: How to test modal? */
  });

  it("should show a tag if provisioned", async () => {
    const { container } = render(
      <BucketCard
        bucketInfo={{ ...info, isProvisioned: true }}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    let tag: Element | null = null;
    await waitFor(() => {
      tag = container.querySelector(".ant-tag");
      expect(tag).toBeTruthy();
    });
    expect(tag!.textContent).toContain("Provisioned");
  });

  it("should not show remove button if provisioned", async () => {
    const { container } = render(
      <BucketCard
        bucketInfo={{ ...info, isProvisioned: true }}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );
    expect(container.querySelector('[title="Remove"]')).toBeNull();
  });

  it("should show deleting tag and disable remove action when actions are disabled", async () => {
    const { container } = render(
      <BucketCard
        bucketInfo={{ ...info, status: Status.DELETING }}
        permissions={{ fullAccess: true }}
        showPanel
        client={client}
        index={0}
        onRemoved={onRemove}
        onShow={() => null}
      />,
    );

    let tag: Element | null = null;
    await waitFor(() => {
      tag = container.querySelector(".ant-tag");
      expect(tag).toBeTruthy();
    });
    expect(tag!.textContent).toContain("Deleting");
    const removeButton = container.querySelector('[title="Remove"]');
    expect(removeButton).toBeTruthy();
    expect((removeButton as HTMLElement).style.cursor).toBe("not-allowed");
  });

  describe("Upload Button Tests", () => {
    it("should show upload button with write permission", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={{ ...info, status: Status.DELETING }}
          permissions={{ fullAccess: true }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      let button: Element | null = null;
      await waitFor(() => {
        button = container.querySelector('[title="Upload File"]');
        expect(button).toBeTruthy();
      });
      expect(button).not.toBeNull();
    });

    it("should not show upload button without write permission", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={info}
          permissions={{ fullAccess: true }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={false}
        />,
      );
      expect(container.querySelector('[title="Upload File"]')).toBeNull();
    });

    it("should call onUpload when upload button is clicked", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={{ ...info, status: Status.READY }}
          permissions={{ fullAccess: true }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      let button: Element | null = null;
      await waitFor(() => {
        button = container.querySelector('[title="Upload File"]');
        expect(button).toBeTruthy();
      });
      fireEvent.click(button!);
      expect(onUpload).toHaveBeenCalled();
    });

    it("should show both upload and remove buttons with full access", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={info}
          permissions={{ fullAccess: true }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      await waitFor(() => {
        expect(container.querySelector('[title="Upload File"]')).toBeTruthy();
        expect(container.querySelector('[title="Remove"]')).toBeTruthy();
      });
    });

    it("should show only remove button with write permission but no upload permission", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={info}
          permissions={{ write: ["test-bucket"], fullAccess: false }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={false}
        />,
      );

      expect(container.querySelector('[title="Upload File"]')).toBeNull();
    });

    it("should show only upload button with upload permission but no remove permission", async () => {
      const { container } = render(
        <BucketCard
          bucketInfo={info}
          permissions={{ write: [], fullAccess: false }}
          showPanel
          client={client}
          index={0}
          onRemoved={onRemove}
          onShow={() => null}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      await waitFor(() => {
        expect(container.querySelector('[title="Upload File"]')).toBeTruthy();
      });
      expect(container.querySelector('[title="Remove"]')).toBeNull();
    });
  });
});
