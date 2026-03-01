import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { Router } from "react-router-dom";
import { createMemoryHistory, MemoryHistory } from "history";
import EntryNavTree, {
  buildNavTree,
  getImmediateChildKeys,
} from "./EntryNavTree";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("EntryNavTree", () => {
  let wrapper: ReactWrapper;
  let history: MemoryHistory;

  beforeEach(() => {
    mockJSDOM();
    history = createMemoryHistory();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  const mountWithRouter = (component: React.ReactElement) => {
    return mount(<Router history={history}>{component}</Router>);
  };

  describe("Rendering", () => {
    it("should return null when no children exist", () => {
      wrapper = mountWithRouter(
        <EntryNavTree
          currentPath="entry1"
          allEntryNames={["entry1", "entry2"]}
          bucketName="test-bucket"
        />,
      );

      expect(wrapper.find(".entryCardNextChildIcon")).toHaveLength(0);
    });

    it("should render browse icon when exactly one child exists", () => {
      wrapper = mountWithRouter(
        <EntryNavTree
          currentPath="folder"
          allEntryNames={["folder", "folder/child"]}
          bucketName="test-bucket"
        />,
      );

      expect(
        wrapper.find(".entryCardNextChildIcon").length,
      ).toBeGreaterThanOrEqual(1);
      expect(wrapper.find("Popover")).toHaveLength(1);
    });

    it("should render browse icon when multiple children exist", () => {
      wrapper = mountWithRouter(
        <EntryNavTree
          currentPath="folder"
          allEntryNames={["folder", "folder/child1", "folder/child2"]}
          bucketName="test-bucket"
        />,
      );

      expect(
        wrapper.find(".entryCardNextChildIcon").length,
      ).toBeGreaterThanOrEqual(1);
      expect(wrapper.find("Popover")).toHaveLength(1);
    });
  });

  describe("Navigation with single child", () => {
    it("should show popover when single child exists", () => {
      wrapper = mountWithRouter(
        <EntryNavTree
          currentPath="folder"
          allEntryNames={["folder", "folder/child"]}
          bucketName="test-bucket"
        />,
      );

      expect(wrapper.find("Popover")).toHaveLength(1);
    });
  });
});

describe("buildNavTree", () => {
  it("should build tree from flat entry names", () => {
    const names = ["folder/a", "folder/b", "folder/c"];
    const tree = buildNavTree(names, "folder/");

    expect(tree).toHaveLength(3);
    expect(tree.map((n) => n.key)).toEqual([
      "folder/a",
      "folder/b",
      "folder/c",
    ]);
  });

  it("should handle nested structures", () => {
    const names = ["folder/sub/a", "folder/sub/b"];
    const tree = buildNavTree(names, "folder/");

    expect(tree).toHaveLength(1);
    expect(tree[0].key).toBe("folder/sub");
    expect(tree[0].children).toHaveLength(2);
  });

  it("should sort entries naturally", () => {
    const names = ["folder/item10", "folder/item2", "folder/item1"];
    const tree = buildNavTree(names, "folder/");

    expect(tree.map((n) => n.key)).toEqual([
      "folder/item1",
      "folder/item2",
      "folder/item10",
    ]);
  });

  it("should mark entries with children as non-leaf", () => {
    const names = ["parent", "parent/child"];
    const tree = buildNavTree(names, "");

    expect(tree[0].isLeaf).toBe(false);
    expect(tree[0].children?.[0].isLeaf).toBe(true);
  });

  it("should mark existing entries as selectable", () => {
    const names = ["folder", "folder/child"];
    const tree = buildNavTree(names, "");

    expect(tree[0].selectable).toBe(true);
  });

  it("should mark non-existent paths as not selectable", () => {
    const names = ["folder/sub/child"];
    const tree = buildNavTree(names, "");

    expect(tree[0].selectable).toBe(false);
  });

  it("should return empty array when no matching entries", () => {
    const names = ["other/entry"];
    const tree = buildNavTree(names, "folder/");

    expect(tree).toHaveLength(0);
  });
});

describe("getImmediateChildKeys", () => {
  it("should return immediate children only", () => {
    const names = ["folder/a", "folder/b", "folder/sub/deep"];
    const children = getImmediateChildKeys(names, "folder");

    expect(children).toEqual(["folder/a", "folder/b", "folder/sub"]);
  });

  it("should handle trailing slash in current path", () => {
    const names = ["folder/a", "folder/b"];
    const children = getImmediateChildKeys(names, "folder/");

    expect(children).toEqual(["folder/a", "folder/b"]);
  });

  it("should return empty array when no children exist", () => {
    const names = ["other/entry"];
    const children = getImmediateChildKeys(names, "folder");

    expect(children).toHaveLength(0);
  });

  it("should sort children naturally", () => {
    const names = ["folder/z", "folder/a", "folder/m"];
    const children = getImmediateChildKeys(names, "folder");

    expect(children).toEqual(["folder/a", "folder/m", "folder/z"]);
  });

  it("should deduplicate nested paths to immediate child", () => {
    const names = ["folder/sub/a", "folder/sub/b", "folder/sub/c"];
    const children = getImmediateChildKeys(names, "folder");

    expect(children).toEqual(["folder/sub"]);
  });
});
