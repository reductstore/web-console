import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockJSDOM } from "../../Helpers/TestHelpers";

import BucketSettingsForm from "./BucketSettingsForm";
import { APIError, Bucket, BucketSettings, Client, QuotaType } from "reduct-js";

describe("Bucket::BucketSettingsForm", () => {
  const client = new Client("");
  const bucket = {} as Bucket;
  beforeEach(() => {
    vi.clearAllMocks();
    mockJSDOM();

    client.getInfo = vi.fn().mockResolvedValue({
      defaults: {
        bucket: {
          maxBlockSize: 64_000_000n,
          maxBlockRecords: 1024,
          quotaSize: 0n,
          quotaType: QuotaType.NONE,
        },
      },
    });
    client.createBucket = vi.fn();
    client.getBucket = vi.fn().mockResolvedValue(bucket);

    bucket.getSettings = vi.fn().mockResolvedValue({
      maxBlockSize: 64_000_001n,
      maxBlockRecords: 1024,
      quotaSize: 1000n,
      quotaType: QuotaType.FIFO,
    });
    bucket.setSettings = vi.fn();
    bucket.rename = vi.fn();
  });

  const renderForm = (
    props: Partial<React.ComponentProps<typeof BucketSettingsForm>> = {},
  ) => {
    const defaultProps = {
      client,
      onCreated: vi.fn(),
    };
    return render(
      <MemoryRouter>
        <BucketSettingsForm {...defaultProps} {...props} />
      </MemoryRouter>,
    );
  };

  const waitForForm = async (container: HTMLElement) => {
    await waitFor(() => {
      expect(container.querySelector(".ant-select")).toBeTruthy();
    });
  };

  it("should show default values for a new bucket", async () => {
    const { container } = renderForm({ showAll: true });
    await waitForForm(container);

    expect(screen.getByTitle("NONE")).toBeTruthy();

    const quotaSizeInput = container.querySelector(
      'input[id="bucketForm_quotaSize"]',
    ) as HTMLInputElement;
    expect(quotaSizeInput?.value).toBe("0");

    const maxBlockRecordsInput = container.querySelector(
      'input[id="bucketForm_maxBlockRecords"]',
    ) as HTMLInputElement;
    expect(maxBlockRecordsInput?.value).toBe("1024");

    const maxBlockSizeInput = container.querySelector(
      'input[id="bucketForm_maxBlockSize"]',
    ) as HTMLInputElement;
    expect(maxBlockSizeInput?.value).toBe("64");
  });

  it("should collapse advanced settings", async () => {
    const { container } = renderForm();
    await waitForForm(container);

    expect(container.querySelector(".ant-collapse-content-active")).toBeNull();
  });

  it("should create a new bucket", async () => {
    let closed = false;
    const { container } = renderForm({
      showAll: true,
      onCreated: () => (closed = true),
    });
    await waitForForm(container);

    const nameInput = container.querySelector("#InputName") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "NewBucket" } });

    const submitButton = screen.getByRole("button", { name: /create/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(closed).toBe(true));
    expect(client.createBucket).toBeCalledWith("NewBucket", {
      maxBlockRecords: 1024n,
      maxBlockSize: 64000000n,
      quotaSize: 0n,
      quotaType: QuotaType.NONE,
    } as unknown as BucketSettings);
  });

  it("should show current settings for a updated bucket", async () => {
    const { container } = renderForm({
      showAll: true,
      bucketName: "bucket",
    });
    await waitForForm(container);

    expect(screen.getByTitle("FIFO")).toBeTruthy();

    const quotaSizeInput = container.querySelector(
      'input[id="bucketForm_quotaSize"]',
    ) as HTMLInputElement;
    expect(quotaSizeInput?.value).toBe("1");

    const maxBlockRecordsInput = container.querySelector(
      'input[id="bucketForm_maxBlockRecords"]',
    ) as HTMLInputElement;
    expect(maxBlockRecordsInput?.value).toBe("1024");

    const maxBlockSizeInput = container.querySelector(
      'input[id="bucketForm_maxBlockSize"]',
    ) as HTMLInputElement;
    expect(maxBlockSizeInput?.value).toBe("64000001");
  });

  it("should create update bucket settings", async () => {
    let closed = false;
    const { container } = renderForm({
      showAll: true,
      bucketName: "bucket",
      onCreated: () => (closed = true),
    });
    await waitForForm(container);

    const submitButton = screen.getByRole("button", { name: /update/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(closed).toBe(true));
    expect(bucket.setSettings).toBeCalledWith({
      maxBlockRecords: 1024n,
      maxBlockSize: 64000001n,
      quotaSize: 1000n,
      quotaType: QuotaType.FIFO,
    } as unknown as BucketSettings);
  });

  it("should rename the bucket if the name is changed", async () => {
    let closed = false;
    const { container } = renderForm({
      showAll: true,
      bucketName: "oldBucket",
      onCreated: () => (closed = true),
    });
    await waitForForm(container);

    const nameInput = container.querySelector("#InputName") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "newBucket" } });

    const submitButton = screen.getByRole("button", { name: /update/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(closed).toBe(true));
    expect(bucket.rename).toBeCalledWith("newBucket");
  });

  it("should rename the bucket and update the URL path", async () => {
    const navigate = vi.fn();
    const { container } = renderForm({
      showAll: true,
      bucketName: "oldBucket",
      navigate,
    });
    await waitForForm(container);

    const nameInput = container.querySelector("#InputName") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "newBucket" } });

    const submitButton = screen.getByRole("button", { name: /update/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(bucket.rename).toBeCalledWith("newBucket");
    expect(navigate).toBeCalledWith("/buckets/newBucket");
  });

  it("should not rename the bucket if the name is not changed", async () => {
    let closed = false;
    const { container } = renderForm({
      showAll: true,
      bucketName: "sameBucket",
      onCreated: () => (closed = true),
    });
    await waitForForm(container);

    const submitButton = screen.getByRole("button", { name: /update/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => expect(closed).toBe(true));
    expect(bucket.rename).not.toBeCalled();
  });

  it("should show error if don't get settings", async () => {
    const err = new APIError("Oops");
    client.getInfo = vi.fn().mockRejectedValue(err);
    renderForm();

    await waitFor(() => {
      expect(screen.getByText(err.message!)).toBeTruthy();
    });
  });

  it("should validate name of bucket", async () => {
    const { container } = renderForm({ showAll: true });
    await waitForForm(container);

    const nameInput = container.querySelector("#InputName") as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: "WRONG#NAME" } });
    await waitFor(() => {
      expect(
        screen.getByText("Bucket name can contain only letters and digests"),
      ).toBeTruthy();
    });
    const createButton = screen.getByRole("button", { name: /create/i });
    expect(createButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("Can't be empty")).toBeTruthy();
    });

    fireEvent.change(nameInput, { target: { value: "good_NAME-1000" } });
    await waitFor(() => {
      expect(createButton).not.toBeDisabled();
    });
  });

  it("should disable update button if readonly", async () => {
    const { container } = renderForm({
      showAll: true,
      readOnly: true,
      bucketName: "bucket",
    });
    await waitForForm(container);

    const submitButton = screen.getByRole("button", { name: /update/i });
    expect(submitButton).toBeDisabled();
  });

  it("should disable InputName only when readonly", async () => {
    const { container: readOnlyContainer } = renderForm({
      showAll: true,
      readOnly: true,
      bucketName: "bucket",
    });
    await waitForForm(readOnlyContainer);
    const readOnlyInput = readOnlyContainer.querySelector(
      "#InputName",
    ) as HTMLInputElement;
    expect(readOnlyInput).toBeDisabled();

    cleanup();

    const { container: editableContainer } = renderForm({
      showAll: true,
      bucketName: "bucket",
    });
    await waitForForm(editableContainer);
    const editableInput = editableContainer.querySelector(
      "#InputName",
    ) as HTMLInputElement;
    expect(editableInput).not.toBeDisabled();
  });

  it.each(["NONE", "FIFO", "HARD"])(
    "should show all available quota types",
    async (quotaType: string) => {
      bucket.getSettings = vi.fn().mockResolvedValue({
        maxBlockSize: 64_000_001n,
        maxBlockRecords: 1024,
        quotaSize: 1000n,
        quotaType: QuotaType[quotaType as keyof typeof QuotaType],
      });

      const { container } = renderForm({
        showAll: true,
        bucketName: "bucket",
      });
      await waitForForm(container);

      expect(screen.getByTitle(quotaType)).toBeTruthy();
    },
  );
});
