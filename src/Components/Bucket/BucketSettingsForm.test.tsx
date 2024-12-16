import { mount } from "enzyme";
import waitUntil from "async-wait-until";
import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";

import BucketSettingsForm from "./BucketSettingsForm";
import { APIError, Bucket, BucketSettings, Client, QuotaType } from "reduct-js";

describe("Bucket::BucketSettingsForm", () => {
  const client = new Client("");
  const bucket = {} as Bucket;
  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();

    client.getInfo = jest.fn().mockResolvedValue({
      defaults: {
        bucket: {
          maxBlockSize: 64_000_000n,
          maxBlockRecords: 1024,
          quotaSize: 0n,
          quotaType: QuotaType.NONE,
        },
      },
    });
    client.createBucket = jest.fn();
    client.getBucket = jest.fn().mockResolvedValue(bucket);

    bucket.getSettings = jest.fn().mockResolvedValue({
      maxBlockSize: 64_000_001n,
      maxBlockRecords: 1024,
      quotaSize: 1000n,
      quotaType: QuotaType.FIFO,
    });
    bucket.setSettings = jest.fn();
    bucket.rename = jest.fn();
  });

  it("should show default values for a new bucket", async () => {
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        client={client}
        onCreated={() => console.log("")}
      />,
    );

    await waitUntil(
      () => wrapper.update().find({ name: "quotaType" }).length > 0,
    );
    expect(
      wrapper.find({ name: "quotaType" }).at(0).props().initialValue,
    ).toEqual("NONE");
    expect(
      wrapper.find({ name: "quotaSize" }).at(0).props().initialValue,
    ).toEqual("0");
    expect(
      wrapper.find({ name: "maxBlockRecords" }).at(0).props().initialValue,
    ).toEqual(1024);
    expect(
      wrapper.find({ name: "maxBlockSize" }).at(0).props().initialValue,
    ).toEqual("64");
  });

  it("should collapse advanced settings", async () => {
    const wrapper = mount(
      <BucketSettingsForm client={client} onCreated={() => console.log("")} />,
    );
    await waitUntilFind(wrapper, { name: "quotaType" });
    expect(wrapper.find({ name: "maxBlockRecords" }).length).toEqual(0);
    expect(wrapper.find({ name: "maxBlockSize" }).length).toEqual(0);
  });

  it("should create a new bucket", async () => {
    let closed = false;
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        client={client}
        onCreated={() => (closed = true)}
      />,
    );

    await waitUntilFind(wrapper, { name: "quotaType" });

    const submit = wrapper.find({ name: "bucketForm" }).at(0);
    submit.props().onFinish({
      maxBlockSize: "64",
      maxBlockRecords: 1024,
      name: "NewBucket",
      quotaType: "1",
      quotaSize: "0",
    });

    await waitUntil(() => closed);
    expect(client.createBucket).toBeCalledWith("NewBucket", {
      maxBlockRecords: 1024n,
      maxBlockSize: 64000000n,
      quotaSize: 0n,
      quotaType: "FIFO",
    } as unknown as BucketSettings);
  });

  it("should show current settings for a updated bucket", async () => {
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        client={client}
        bucketName="bucket"
        onCreated={() => console.log("")}
      />,
    );

    await waitUntilFind(wrapper, { name: "quotaType" });
    expect(
      wrapper.find({ name: "quotaType" }).at(0).props().initialValue,
    ).toEqual("FIFO");
    expect(
      wrapper.find({ name: "quotaSize" }).at(0).props().initialValue,
    ).toEqual("1");
    expect(
      wrapper.find({ name: "maxBlockRecords" }).at(0).props().initialValue,
    ).toEqual(1024);
    expect(
      wrapper.find({ name: "maxBlockSize" }).at(0).props().initialValue,
    ).toEqual("64000001");
  });

  it("should create update bucket settings", async () => {
    let closed = false;
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        bucketName="bucket"
        client={client}
        onCreated={() => (closed = true)}
      />,
    );
    await waitUntilFind(wrapper, { name: "quotaType" });

    const submit = wrapper.find({ name: "bucketForm" }).at(0);
    submit.props().onFinish({
      maxBlockSize: "64",
      maxBlockRecords: 1024,
      name: "NewBucket",
      quotaType: "NONE",
      quotaSize: "0",
    });

    await waitUntil(() => closed);
    expect(bucket.setSettings).toBeCalledWith({
      maxBlockRecords: 1024n,
      maxBlockSize: 64n,
      quotaSize: 0n,
      quotaType: QuotaType.NONE,
    } as unknown as BucketSettings);
  });

  it("should rename the bucket if the name is changed", async () => {
    let closed = false;
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        bucketName="oldBucket"
        client={client}
        onCreated={() => (closed = true)}
      />,
    );
    await waitUntilFind(wrapper, { name: "quotaType" });

    const submit = wrapper.find({ name: "bucketForm" }).at(0);
    submit.props().onFinish({
      maxBlockSize: "64",
      maxBlockRecords: 1024,
      name: "newBucket",
      quotaType: "NONE",
      quotaSize: "0",
    });

    await waitUntil(() => closed);
    expect(bucket.rename).toBeCalledWith("newBucket");
  });

  it("should rename the bucket and update the URL path", async () => {
    const history = { push: jest.fn() };
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        client={client}
        bucketName="oldBucket"
        onCreated={() => console.log("")}
        history={history}
      />,
    );

    await waitUntilFind(wrapper, { name: "quotaType" });

    const submit = wrapper.find({ name: "bucketForm" }).at(0);
    submit.props().onFinish({
      maxBlockSize: "64",
      maxBlockRecords: 1024,
      name: "newBucket",
      quotaType: "NONE",
      quotaSize: "0",
    });

    await waitUntil(() => history.push.mock.calls.length > 0);
    expect(bucket.rename).toBeCalledWith("newBucket");
    expect(history.push).toBeCalledWith("/buckets/newBucket");
  });

  it("should not rename the bucket if the name is not changed", async () => {
    let closed = false;
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        bucketName="sameBucket"
        client={client}
        onCreated={() => (closed = true)}
      />,
    );
    await waitUntilFind(wrapper, { name: "quotaType" });

    const submit = wrapper.find({ name: "bucketForm" }).at(0);
    submit.props().onFinish({
      maxBlockSize: "64",
      maxBlockRecords: 1024,
      name: "sameBucket",
      quotaType: "NONE",
      quotaSize: "0",
    });

    await waitUntil(() => closed);
    expect(bucket.rename).not.toBeCalled();
  });

  it("should show error if don't get settings", async () => {
    const err = new APIError("Oops");
    client.getInfo = jest.fn().mockRejectedValue(err);
    const wrapper = mount(
      <BucketSettingsForm client={client} onCreated={() => console.log("")} />,
    );

    await waitUntilFind(wrapper, { type: "error" });
    expect(wrapper.render().text()).toContain(err.message);
  });

  it("should validate name of bucket", async () => {
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        client={client}
        onCreated={() => (closed = true)}
      />,
    );
    const nameInput = await waitUntilFind(wrapper, "#InputName");
    const enter = (value: string) => {
      nameInput.hostNodes().simulate("change", { target: { value } });
    };

    enter("WRONG#NAME");
    await waitUntilFind(wrapper, { type: "error" });
    expect(wrapper.render().text()).toContain(
      "Bucket name can contain only letters and digests",
    );
    const createButton = await waitUntilFind(wrapper, { type: "submit" });
    expect(createButton.props().disabled).toBeTruthy();

    enter("");
    expect(wrapper.render().text()).toContain("Can't be empty");

    enter("good_NAME-1000");
    expect(createButton.update().props().disabled).toBeFalsy();
  });

  it("should disable update button if readonly", async () => {
    const wrapper = mount(
      <BucketSettingsForm
        showAll
        readOnly
        client={client}
        bucketName="bucket"
        onCreated={() => console.log("")}
      />,
    );
    await waitUntilFind(wrapper, { name: "quotaType" });
    const submit = wrapper.find({ type: "submit" }).at(0);
    expect(submit.props().disabled).toBeTruthy();
  });

  it("should disable InputName only when readonly", async () => {
    const wrapperReadOnly = mount(
      <BucketSettingsForm
        showAll
        readOnly
        client={client}
        bucketName="bucket"
        onCreated={() => console.log("")}
      />,
    );
    await waitUntilFind(wrapperReadOnly, { name: "quotaType" });
    const inputReadOnly = wrapperReadOnly.find("#InputName").at(0);
    expect(inputReadOnly.props().disabled).toBeTruthy();

    const wrapperEditable = mount(
      <BucketSettingsForm
        showAll
        client={client}
        bucketName="bucket"
        onCreated={() => console.log("")}
      />,
    );
    await waitUntilFind(wrapperEditable, { name: "quotaType" });
    const inputEditable = wrapperEditable.find("#InputName").at(0);
    expect(inputEditable.props().disabled).toBeFalsy();
  });

  it.each(["NONE", "FIFO", "HARD"])(
    "should show all available quota types",
    async (quotaType: string) => {
      bucket.getSettings = jest.fn().mockResolvedValue({
        maxBlockSize: 64_000_001n,
        maxBlockRecords: 1024,
        quotaSize: 1000n,
        quotaType: QuotaType[quotaType as keyof typeof QuotaType],
      });

      const wrapper = mount(
        <BucketSettingsForm
          showAll
          client={client}
          bucketName={"bucket"}
          onCreated={() => console.log("")}
        />,
      );

      await waitUntilFind(wrapper, { name: "quotaType" });
      const input = wrapper.find({ name: "quotaType" }).at(0);
      console.log(input.debug());
      expect(input.props().initialValue).toEqual(quotaType);
    },
  );
});
