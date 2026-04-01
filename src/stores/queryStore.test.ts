import { useQueryStore } from "./queryStore";

describe("queryStore", () => {
  beforeEach(() => {
    useQueryStore.getState().clearQueries();
  });

  describe("getQueries", () => {
    it("should return empty array for unknown entry", () => {
      const queries = useQueryStore.getState().getQueries("bucket", "unknown");
      expect(queries).toEqual([]);
    });
  });

  describe("saveQuery", () => {
    it("should save query to store", () => {
      useQueryStore.getState().saveQuery("bucket", "test-entry", {
        name: "my-query",
        query: '{"$each_t": "1s"}',
      });

      const queries = useQueryStore
        .getState()
        .getQueries("bucket", "test-entry");
      expect(queries).toHaveLength(1);
      expect(queries[0]).toMatchObject({
        name: "my-query",
        query: '{"$each_t": "1s"}',
      });
    });

    it("should set loadedQueryName after saving", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "q1", query: "{}" });
      expect(
        useQueryStore.getState().getLoadedQueryName("bucket", "test-entry"),
      ).toBe("q1");
    });

    it("should save timeFormat and rangeKey", () => {
      useQueryStore.getState().saveQuery("bucket", "test-entry", {
        name: "q1",
        query: "{}",
        timeFormat: "Unix",
        rangeKey: "last7",
      });

      const queries = useQueryStore
        .getState()
        .getQueries("bucket", "test-entry");
      expect(queries[0].timeFormat).toBe("Unix");
      expect(queries[0].rangeKey).toBe("last7");
    });

    it("should overwrite existing query with same name", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "q1", query: "{}" });
      useQueryStore.getState().saveQuery("bucket", "test-entry", {
        name: "q1",
        query: '{"$each_t": "5s"}',
      });

      const queries = useQueryStore
        .getState()
        .getQueries("bucket", "test-entry");
      expect(queries).toHaveLength(1);
      expect(queries[0].query).toBe('{"$each_t": "5s"}');
    });

    it("should sort queries by name", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "zebra", query: "{}" });
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "alpha", query: "{}" });

      const queries = useQueryStore
        .getState()
        .getQueries("bucket", "test-entry");
      expect(queries[0].name).toBe("alpha");
      expect(queries[1].name).toBe("zebra");
    });
  });

  describe("deleteQuery", () => {
    it("should remove query from store", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "my-query", query: "{}" });
      useQueryStore.getState().deleteQuery("bucket", "test-entry", "my-query");

      const queries = useQueryStore
        .getState()
        .getQueries("bucket", "test-entry");
      expect(queries).toHaveLength(0);
    });

    it("should clear loadedQueryName if deleted query was loaded", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "my-query", query: "{}" });
      expect(
        useQueryStore.getState().getLoadedQueryName("bucket", "test-entry"),
      ).toBe("my-query");

      useQueryStore.getState().deleteQuery("bucket", "test-entry", "my-query");
      expect(
        useQueryStore.getState().getLoadedQueryName("bucket", "test-entry"),
      ).toBeNull();
    });

    it("should not clear loadedQueryName if different query was deleted", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "q1", query: "{}" });
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "q2", query: "{}" });

      useQueryStore.getState().deleteQuery("bucket", "test-entry", "q1");
      expect(
        useQueryStore.getState().getLoadedQueryName("bucket", "test-entry"),
      ).toBe("q2");
    });
  });

  describe("clearQueries", () => {
    it("should clear all cached queries", () => {
      useQueryStore
        .getState()
        .saveQuery("bucket", "test-entry", { name: "q1", query: "{}" });
      expect(
        useQueryStore.getState().getQueries("bucket", "test-entry"),
      ).toHaveLength(1);

      useQueryStore.getState().clearQueries();
      expect(
        useQueryStore.getState().getQueries("bucket", "test-entry"),
      ).toEqual([]);
    });
  });
});
