import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { Router } from "react-router-dom";
import { createMemoryHistory, MemoryHistory } from "history";
import EntryBreadcrumb, { encodeEntryPath } from "./EntryBreadcrumb";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("EntryBreadcrumb", () => {
  let wrapper: ReactWrapper;
  let history: MemoryHistory;

  beforeEach(() => {
    mockJSDOM();
    history = createMemoryHistory();
  });

  afterEach(() => {
    if (wrapper && wrapper.length > 0) {
      wrapper.unmount();
    }
  });

  const mountWithRouter = (component: React.ReactElement) => {
    return mount(<Router history={history}>{component}</Router>);
  };

  describe("Rendering", () => {
    it("should render bucket name as a link", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      const links = wrapper.find("a");
      expect(links.at(0).text()).toBe("test-bucket");
    });

    it("should render single segment entry name without link", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      const spans = wrapper.find("span");
      expect(spans.last().text()).toBe("entry1");
    });

    it("should render multi-segment path with intermediate links", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      const links = wrapper.find("a");
      expect(links).toHaveLength(3);
      expect(links.at(0).text()).toBe("test-bucket");
      expect(links.at(1).text()).toBe("folder");
      expect(links.at(2).text()).toBe("subfolder");

      const spans = wrapper.find("span");
      expect(spans.last().text()).toBe("file");
    });

    it("should include separators between segments", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="folder/file" />,
      );

      const text = wrapper.text();
      expect(text).toContain("test-bucket / folder / file");
    });
  });

  describe("Navigation", () => {
    it("should navigate to bucket when bucket name is clicked", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb bucketName="test-bucket" entryName="entry1" />,
      );

      const bucketLink = wrapper.find("a").at(0);
      bucketLink.simulate("click");

      expect(history.location.pathname).toBe("/buckets/test-bucket");
    });

    it("should navigate to intermediate path when segment is clicked", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      const folderLink = wrapper.find("a").at(1);
      folderLink.simulate("click");

      expect(history.location.pathname).toBe(
        "/buckets/test-bucket/entries/folder",
      );
    });

    it("should navigate to nested path when clicking deeper segment", () => {
      wrapper = mountWithRouter(
        <EntryBreadcrumb
          bucketName="test-bucket"
          entryName="folder/subfolder/file"
        />,
      );

      const subfolderLink = wrapper.find("a").at(2);
      subfolderLink.simulate("click");

      expect(history.location.pathname).toBe(
        "/buckets/test-bucket/entries/folder/subfolder",
      );
    });
  });

  describe("encodeEntryPath", () => {
    it("should encode special characters in path segments", () => {
      expect(encodeEntryPath("folder/file name")).toBe("folder/file%20name");
    });

    it("should preserve slashes as separators", () => {
      expect(encodeEntryPath("a/b/c")).toBe("a/b/c");
    });

    it("should encode multiple special characters", () => {
      expect(encodeEntryPath("folder/file#1?test")).toBe(
        "folder/file%231%3Ftest",
      );
    });

    it("should handle single segment", () => {
      expect(encodeEntryPath("simple")).toBe("simple");
    });
  });
});
