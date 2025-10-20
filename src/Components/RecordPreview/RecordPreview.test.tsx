import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { Button, Typography, Alert } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import RecordPreview from "./RecordPreview";
import { Bucket } from "reduct-js";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("RecordPreview", () => {
  let wrapper: ReactWrapper;
  const mockBucket = {
    createQueryLink: jest.fn(),
  } as unknown as Bucket;

  const defaultProps = {
    contentType: "text/plain",
    size: 1024,
    fileName: "test.txt",
    entryName: "test-entry",
    timestamp: 1000n,
    bucket: mockBucket,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJSDOM();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  it("should render preview card", () => {
    wrapper = mount(<RecordPreview {...defaultProps} />);

    expect(wrapper.find(".recordPreviewCard").exists()).toBe(true);
    expect(wrapper.find(Typography.Text).at(0).text()).toBe("Content Preview");
  });

  it("should show hide/show toggle button", () => {
    wrapper = mount(<RecordPreview {...defaultProps} />);

    const toggleButton = wrapper.find(Button).at(0);
    expect(toggleButton.exists()).toBe(true);
    expect(toggleButton.find(EyeInvisibleOutlined).exists()).toBe(true);
  });

  it("should toggle preview visibility", () => {
    wrapper = mount(<RecordPreview {...defaultProps} />);

    const toggleButton = wrapper.find(Button).at(0);
    toggleButton.simulate("click");
    wrapper.update();

    expect(wrapper.find(EyeOutlined).exists()).toBe(true);
    expect(wrapper.find(".previewContent").exists()).toBe(false);
  });

  it("should show unsupported message for large files", () => {
    const largeFileProps = {
      ...defaultProps,
      size: 50 * 1024 * 1024,
    };

    wrapper = mount(<RecordPreview {...largeFileProps} />);

    expect(wrapper.find(Typography.Text).last().text()).toContain(
      "Preview not available",
    );
  });

  it("should handle image content type", () => {
    const imageProps = {
      ...defaultProps,
      contentType: "image/png",
    };

    (mockBucket.createQueryLink as jest.Mock).mockResolvedValue(
      "http://test-url",
    );

    wrapper = mount(<RecordPreview {...imageProps} />);

    expect(mockBucket.createQueryLink).toHaveBeenCalled();
  });

  it("should handle text content type", async () => {
    const textProps = {
      ...defaultProps,
      contentType: "text/plain",
    };

    (mockBucket.createQueryLink as jest.Mock).mockResolvedValue(
      "http://test-url",
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("test content"),
    });

    wrapper = mount(<RecordPreview {...textProps} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    wrapper.update();

    expect(global.fetch).toHaveBeenCalledWith("http://test-url");
  });

  it("should show error on fetch failure", async () => {
    (mockBucket.createQueryLink as jest.Mock).mockRejectedValue(
      new Error("Network error"),
    );

    wrapper = mount(<RecordPreview {...defaultProps} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    wrapper.update();

    expect(wrapper.find(Alert).exists()).toBe(true);
  });
});
