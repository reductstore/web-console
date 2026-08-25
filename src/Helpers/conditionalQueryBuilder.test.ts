import {
  addCondition,
  FlatCondition,
  isLabelOperator,
  parseBuilderList,
  removeCondition,
  serializeBuilderList,
  updateCondition,
} from "./conditionalQueryBuilder";

const makeCondition = (
  overrides: Partial<FlatCondition> = {},
): FlatCondition => ({
  id: overrides.id ?? "cond-id",
  label: overrides.label ?? "status",
  operator: overrides.operator ?? "$eq",
  value: overrides.value ?? "active",
  negated: overrides.negated ?? false,
  connector: overrides.connector ?? "$and",
});

describe("conditionalQueryBuilder", () => {
  describe("isLabelOperator", () => {
    it("accepts every known label operator", () => {
      const operators = [
        "$eq",
        "$ne",
        "$gt",
        "$gte",
        "$lt",
        "$lte",
        "$contains",
        "$starts_with",
        "$ends_with",
        "$in",
        "$nin",
      ];
      operators.forEach((op) => expect(isLabelOperator(op)).toBe(true));
    });

    it("rejects logical operators and unknown strings", () => {
      expect(isLabelOperator("$and")).toBe(false);
      expect(isLabelOperator("$foo")).toBe(false);
    });
  });

  describe("serializeBuilderList", () => {
    it("returns an empty object for an empty list", () => {
      expect(serializeBuilderList([])).toEqual({});
    });

    it("serializes a single condition without wrapping", () => {
      expect(serializeBuilderList([makeCondition()])).toEqual({
        "&status": { $eq: "active" },
      });
    });

    it("sends a numeric-looking value as a real JSON number", () => {
      // A $gt/$lt comparison against a numeric label silently matches
      // nothing if the value is sent as a JSON string instead of a
      // number, so a value like "100" must be coerced to 100.
      const list = [
        makeCondition({ label: "gps_z", operator: "$gt", value: "100" }),
      ];
      expect(serializeBuilderList(list)).toEqual({ "&gps_z": { $gt: 100 } });
    });

    it("keeps a non-numeric value as text", () => {
      expect(serializeBuilderList([makeCondition()])).toEqual({
        "&status": { $eq: "active" },
      });
    });

    it("negates a single condition with $not", () => {
      const list = [makeCondition({ negated: true })];
      expect(serializeBuilderList(list)).toEqual({
        $not: { "&status": { $eq: "active" } },
      });
    });

    it("folds two conditions with the same connector into one array", () => {
      const list = [
        makeCondition({ id: "a" }),
        makeCondition({
          id: "b",
          label: "count",
          operator: "$gt",
          value: "10",
          connector: "$and",
        }),
      ];
      expect(serializeBuilderList(list)).toEqual({
        $and: [{ "&status": { $eq: "active" } }, { "&count": { $gt: 10 } }],
      });
    });

    it("left-folds a chain with mixed connectors, most recent outermost", () => {
      const list = [
        makeCondition({ id: "a", label: "a" }),
        makeCondition({ id: "b", label: "b", connector: "$and" }),
        makeCondition({ id: "c", label: "c", connector: "$or" }),
      ];
      expect(serializeBuilderList(list)).toEqual({
        $or: [
          { $and: [{ "&a": { $eq: "active" } }, { "&b": { $eq: "active" } }] },
          { "&c": { $eq: "active" } },
        ],
      });
    });

    it("wraps only the negated item in a mixed chain", () => {
      const list = [
        makeCondition({ id: "a", label: "a" }),
        makeCondition({
          id: "b",
          label: "b",
          connector: "$and",
          negated: true,
        }),
      ];
      expect(serializeBuilderList(list)).toEqual({
        $and: [
          { "&a": { $eq: "active" } },
          { $not: { "&b": { $eq: "active" } } },
        ],
      });
    });
  });

  describe("parseBuilderList", () => {
    it("treats an empty object as an empty list", () => {
      expect(parseBuilderList({})).toEqual({ success: true, list: [] });
    });

    it("treats a lone $each_t as an empty list and surfaces its value", () => {
      expect(parseBuilderList({ $each_t: "$__interval" })).toEqual({
        success: true,
        list: [],
        eachT: "$__interval",
      });
    });

    it("rejects $each_t combined with a real condition", () => {
      const result = parseBuilderList({
        $each_t: "30s",
        "&status": { $eq: "active" },
      });
      expect(result.success).toBe(false);
    });

    it("parses a single bare condition", () => {
      const result = parseBuilderList({ "&status": { $eq: "active" } });
      expect(result.success).toBe(true);
      expect(result.list).toEqual([
        expect.objectContaining({
          label: "status",
          operator: "$eq",
          value: "active",
          negated: false,
        }),
      ]);
    });

    it("parses a single $not-wrapped condition", () => {
      const result = parseBuilderList({
        $not: { "&status": { $eq: "active" } },
      });
      expect(result.success).toBe(true);
      expect(result.list).toEqual([
        expect.objectContaining({ label: "status", negated: true }),
      ]);
    });

    it("parses a flat $and array into a chain with one connector", () => {
      const result = parseBuilderList({
        $and: [
          { "&status": { $eq: "active" } },
          { "&count": { $gt: 10 } },
          { "&method": { $eq: "GET" } },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.list).toHaveLength(3);
      expect(result.list?.map((item) => item.label)).toEqual([
        "status",
        "count",
        "method",
      ]);
      expect(result.list?.[1].connector).toBe("$and");
      expect(result.list?.[2].connector).toBe("$and");
    });

    it("parses a left-associative mixed chain built by the serializer", () => {
      const json = {
        $or: [
          {
            $and: [{ "&a": { $eq: "active" } }, { "&b": { $eq: "active" } }],
          },
          { "&c": { $eq: "active" } },
        ],
      };
      const result = parseBuilderList(json);
      expect(result.success).toBe(true);
      expect(result.list?.map((item) => item.label)).toEqual(["a", "b", "c"]);
      expect(result.list?.[1].connector).toBe("$and");
      expect(result.list?.[2].connector).toBe("$or");
    });

    it("rejects real nested grouping (a sub-expression combined as a unit)", () => {
      // "a AND (b OR c)" can't be flattened into a single chain without
      // changing its meaning, so it's left to JSON mode.
      const json = {
        $and: [
          { "&a": { $eq: "active" } },
          { $or: [{ "&b": { $eq: "active" } }, { "&c": { $eq: "active" } }] },
        ],
      };
      expect(parseBuilderList(json).success).toBe(false);
    });

    it("rejects $not wrapping more than one condition", () => {
      const json = {
        $not: { $and: [{ "&a": { $eq: "1" } }, { "&b": { $eq: "2" } }] },
      };
      expect(parseBuilderList(json).success).toBe(false);
    });

    it("rejects unknown operators", () => {
      expect(parseBuilderList({ $xor: [{ "&a": { $eq: "1" } }] }).success).toBe(
        false,
      );
    });

    it("accepts a numeric comparison value and normalizes it to text", () => {
      const result = parseBuilderList({ "&count": { $gt: 10 } });
      expect(result.success).toBe(true);
      expect(result.list).toEqual([
        expect.objectContaining({
          label: "count",
          operator: "$gt",
          value: "10",
        }),
      ]);
    });

    it("rejects a boolean comparison value", () => {
      expect(parseBuilderList({ "&flag": { $eq: true } }).success).toBe(false);
    });

    it("rejects a computed label", () => {
      expect(parseBuilderList({ "@computed": { $eq: "x" } }).success).toBe(
        false,
      );
    });

    it("rejects non-object input", () => {
      expect(parseBuilderList("not json").success).toBe(false);
      expect(parseBuilderList(42).success).toBe(false);
      expect(parseBuilderList(null).success).toBe(false);
    });

    it("round-trips through serializeBuilderList for simple and mixed chains", () => {
      const lists: FlatCondition[][] = [
        [],
        [makeCondition()],
        [
          makeCondition({ id: "a" }),
          makeCondition({ id: "b", label: "count", connector: "$and" }),
        ],
        [
          makeCondition({ id: "a", label: "a" }),
          makeCondition({ id: "b", label: "b", connector: "$and" }),
          makeCondition({
            id: "c",
            label: "c",
            connector: "$or",
            negated: true,
          }),
        ],
      ];

      const stripIds = (list: FlatCondition[]) =>
        list.map(({ id: _id, ...rest }) => rest);

      for (const list of lists) {
        const json = serializeBuilderList(list);
        const result = parseBuilderList(json);
        expect(result.success).toBe(true);
        expect(stripIds(result.list ?? [])).toEqual(stripIds(list));
      }
    });
  });

  describe("updateCondition", () => {
    it("updates the matching condition's fields", () => {
      const list = [
        makeCondition({ id: "a" }),
        makeCondition({ id: "b", label: "count" }),
      ];
      const result = updateCondition(list, "b", { value: "99" });
      expect(result[1].value).toBe("99");
      expect(result[0].value).toBe("active");
    });

    it("does not mutate the original list", () => {
      const list = [makeCondition({ id: "a" })];
      updateCondition(list, "a", { value: "changed" });
      expect(list[0].value).toBe("active");
    });

    it("returns the list unchanged when the id is not found", () => {
      const list = [makeCondition({ id: "a" })];
      expect(updateCondition(list, "missing", { value: "x" })).toEqual(list);
    });

    it("can toggle negated", () => {
      const list = [makeCondition({ id: "a", negated: false })];
      const result = updateCondition(list, "a", { negated: true });
      expect(result[0].negated).toBe(true);
    });

    it("changes only the targeted condition's connector", () => {
      const list = [
        makeCondition({ id: "a", connector: "$and" }),
        makeCondition({ id: "b", connector: "$and" }),
      ];
      const result = updateCondition(list, "b", { connector: "$or" });
      expect(result[0].connector).toBe("$and");
      expect(result[1].connector).toBe("$or");
    });

    it("can set connector and negated together", () => {
      const list = [makeCondition({ id: "a", connector: "$or" })];
      const result = updateCondition(list, "a", {
        connector: "$and",
        negated: true,
      });
      expect(result[0].connector).toBe("$and");
      expect(result[0].negated).toBe(true);
    });
  });

  describe("removeCondition", () => {
    it("removes the matching condition", () => {
      const list = [
        makeCondition({ id: "a" }),
        makeCondition({ id: "b" }),
        makeCondition({ id: "c" }),
      ];
      const result = removeCondition(list, "b");
      expect(result.map((item) => item.id)).toEqual(["a", "c"]);
    });

    it("does not mutate the original list", () => {
      const list = [makeCondition({ id: "a" }), makeCondition({ id: "b" })];
      removeCondition(list, "a");
      expect(list).toHaveLength(2);
    });
  });

  describe("addCondition", () => {
    it("creates a one-item list when starting empty", () => {
      const result = addCondition([]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          label: "",
          operator: "$eq",
          value: "",
          negated: false,
        }),
      );
    });

    it("appends an empty condition to an existing list", () => {
      const list = [makeCondition({ id: "a" })];
      const result = addCondition(list);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("a");
      expect(result[1].label).toBe("");
    });
  });
});
