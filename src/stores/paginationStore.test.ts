import { usePaginationStore, defaultPageSize } from "./paginationStore";

describe("paginationStore", () => {
  beforeEach(() => {
    usePaginationStore.getState().clearAllPageSizes();
  });

  describe("defaultPageSize", () => {
    it("should have correct default value", () => {
      expect(defaultPageSize).toBe(10);
    });
  });

  describe("getPageSize", () => {
    it("should return default page size for unknown key", () => {
      const store = usePaginationStore.getState();
      const pageSize = store.getPageSize("unknown-key");
      expect(pageSize).toBe(defaultPageSize);
    });

    it("should return stored page size for known key", () => {
      const store = usePaginationStore.getState();
      const testPageSize = 20;

      store.setPageSize("test-key", testPageSize);
      const pageSize = store.getPageSize("test-key");

      expect(pageSize).toBe(testPageSize);
    });
  });

  describe("setPageSize", () => {
    it("should store page size", () => {
      const testPageSize = 50;

      usePaginationStore.getState().setPageSize("test-key", testPageSize);

      expect(usePaginationStore.getState().pageSizes["test-key"]).toBe(
        testPageSize,
      );
    });

    it("should update existing page size", () => {
      const initialPageSize = 10;
      const updatedPageSize = 25;

      usePaginationStore.getState().setPageSize("test-key", initialPageSize);
      usePaginationStore.getState().setPageSize("test-key", updatedPageSize);

      expect(usePaginationStore.getState().pageSizes["test-key"]).toBe(
        updatedPageSize,
      );
    });
  });

  describe("clearAllPageSizes", () => {
    it("should clear all page sizes", () => {
      usePaginationStore.getState().setPageSize("key1", 20);
      usePaginationStore.getState().setPageSize("key2", 30);

      expect(Object.keys(usePaginationStore.getState().pageSizes)).toHaveLength(
        2,
      );

      usePaginationStore.getState().clearAllPageSizes();

      expect(usePaginationStore.getState().pageSizes).toEqual({});
    });
  });
});
