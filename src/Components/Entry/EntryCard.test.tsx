import { mockJSDOM } from "../../Helpers/TestHelpers";
import { mount } from "enzyme";
import EntryCard from "./EntryCard";
import { EntryInfo, Client } from "reduct-js";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";

describe("EntryCard", () => {
  beforeEach(() => mockJSDOM());

  const info: EntryInfo = {
    name: "entry",
    size: 50000n,
    recordCount: 5n,
    blockCount: 2n,
    oldestRecord: 1000000n,
    latestRecord: 2000000n,
  };

  const client = new Client("");
  const onRemoved = jest.fn();
  const onUpload = jest.fn();

  it("should show remove button with permissions", async () => {
    const wrapper = mount(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: true }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    const button = wrapper.find(DeleteOutlined);
    expect(button.length).toEqual(1);
  });

  it("should not show remove button without permissions", async () => {
    const wrapper = mount(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: false }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    const button = wrapper.find(DeleteOutlined);
    expect(button.length).toEqual(0);
  });

  it("should display timestamps in UTC format by default", async () => {
    const wrapper = mount(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(4).text()).toContain("1970-01-01T");
    expect(timestamps.at(5).text()).toContain("1970-01-01T");
  });

  it("should display timestamps in Unix format when showUnix is true", async () => {
    const wrapper = mount(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        showUnix={true}
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(4).text()).toEqual("1000000");
    expect(timestamps.at(5).text()).toEqual("2000000");
  });

  it("should display --- for timestamps when recordCount is 0", async () => {
    const emptyInfo = { ...info, recordCount: 0n };
    const wrapper = mount(
      <EntryCard
        entryInfo={emptyInfo}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(3).text()).toEqual("---");
    expect(timestamps.at(4).text()).toEqual("---");
  });

  describe("Upload Button Tests", () => {
    it("should show upload button with write permission", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ fullAccess: true }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      const button = wrapper.find(UploadOutlined);
      expect(button.length).toEqual(1);
      expect(button.prop("title")).toBe("Upload File");
    });

    it("should not show upload button without write permission", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ fullAccess: true }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={false}
        />,
      );
      const button = wrapper.find(UploadOutlined);
      expect(button.length).toEqual(0);
    });

    it("should call onUpload when upload button is clicked", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ fullAccess: true }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      const button = wrapper.find(UploadOutlined);
      button.simulate("click");
      expect(onUpload).toHaveBeenCalled();
    });

    it("should show both upload and delete buttons with full access", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ fullAccess: true }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      const uploadButton = wrapper.find(UploadOutlined);
      const deleteButton = wrapper.find(DeleteOutlined);
      expect(uploadButton.length).toEqual(1);
      expect(deleteButton.length).toEqual(1);
    });

    it("should show only delete button with write permission but no upload permission", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ write: ["test-bucket"], fullAccess: false }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={false}
        />,
      );
      const uploadButton = wrapper.find(UploadOutlined);
      const deleteButton = wrapper.find(DeleteOutlined);
      expect(uploadButton.length).toEqual(0);
      expect(deleteButton.length).toEqual(1);
    });

    it("should show only upload button with upload permission but no delete permission", async () => {
      const wrapper = mount(
        <EntryCard
          entryInfo={info}
          permissions={{ write: [], fullAccess: false }}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          onUpload={onUpload}
          hasWritePermission={true}
        />,
      );
      const uploadButton = wrapper.find(UploadOutlined);
      const deleteButton = wrapper.find(DeleteOutlined);
      expect(uploadButton.length).toEqual(1);
      expect(deleteButton.length).toEqual(0);
    });
  });
});
