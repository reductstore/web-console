import { mockJSDOM, waitUntilFind } from "../../Helpers/TestHelpers";
import { mount } from "enzyme";
import BucketCard from "./BucketCard";
import { BucketInfo, Client } from "reduct-js";
import { UploadOutlined } from "@ant-design/icons";

describe("BucketCard", () => {
  beforeEach(() => mockJSDOM());

  const info: BucketInfo = {
    name: "bucket",
    entryCount: 5n,
    size: 50000n,
    oldestRecord: 0n,
    latestRecord: 1000000n,
    isProvisioned: false,
  };

  const client = new Client("");
  const onRemove = jest.fn();
  const onUpload = jest.fn();

  it("should call a callback when settings is pressed", async () => {
    const wrapper = mount(
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
    const button = await waitUntilFind(wrapper, { title: "Settings" });

    button.hostNodes().simulate("click");
    /* TODO: How to test modal? */
  });

  it("should call a callback when remove is pressed", async () => {
    const wrapper = mount(
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
    const button = await waitUntilFind(wrapper, { title: "Remove" });

    button.hostNodes().simulate("click");
    /* TODO: How to test modal? */
  });

  it("should show a tag if provisioned", async () => {
    const wrapper = mount(
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
    const tag = await waitUntilFind(wrapper, ".ant-tag");
    expect(tag.hostNodes().render().text()).toEqual("Provisioned");
  });

  it("should not show remove button if provisioned", async () => {
    const wrapper = mount(
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
    const button = wrapper.find({ title: "Remove" });
    expect(button.length).toEqual(0);
  });

  describe("Upload Button Tests", () => {
    it("should show upload button with write permission", async () => {
      const wrapper = mount(
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
      const button = await waitUntilFind(
        wrapper,
        "UploadOutlined[title='Upload File']",
      );
      expect(button.length).toEqual(1);
      expect(button.prop("title")).toBe("Upload File");
    });

    it("should not show upload button without write permission", async () => {
      const wrapper = mount(
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
      const button = wrapper.find("UploadOutlined[title='Upload File']");
      expect(button.length).toEqual(0);
    });

    it("should call onUpload when upload button is clicked", async () => {
      const wrapper = mount(
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
      const button = await waitUntilFind(
        wrapper,
        "UploadOutlined[title='Upload File']",
      );
      button.simulate("click");
      expect(onUpload).toHaveBeenCalled();
    });

    it("should show both upload and remove buttons with full access", async () => {
      const wrapper = mount(
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
      const uploadButton = await waitUntilFind(
        wrapper,
        "UploadOutlined[title='Upload File']",
      );
      const removeButton = await waitUntilFind(
        wrapper,
        "DeleteOutlined[title='Remove']",
      );
      expect(uploadButton.length).toEqual(1);
      expect(removeButton.length).toEqual(1);
    });

    it("should show only remove button with write permission but no upload permission", async () => {
      const wrapper = mount(
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
      await wrapper.update();
      const uploadButton = wrapper.find("UploadOutlined[title='Upload File']");
      const removeButton = wrapper.find("DeleteOutlined[title='Remove']");
      expect(uploadButton.length).toEqual(0);
    });

    it("should show only upload button with upload permission but no remove permission", async () => {
      const wrapper = mount(
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
      await wrapper.update();
      const uploadButton = await waitUntilFind(
        wrapper,
        "UploadOutlined[title='Upload File']",
      );
      const removeButton = wrapper.find("DeleteOutlined[title='Remove']");
      expect(uploadButton.length).toEqual(1);
      expect(removeButton.length).toEqual(0);
    });
  });
});
