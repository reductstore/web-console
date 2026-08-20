import {
  addCondition,
  addGroup,
  BuilderTree,
  ConditionGroup,
  isLabelOperator,
  isLogicalOperator,
  LabelCondition,
  parseBuilderTree,
  removeNode,
  serializeBuilderTree,
  updateCondition,
  updateGroupOperator,
} from "./conditionalQueryBuilder";

const makeCondition = (
  overrides: Partial<LabelCondition> = {},
): LabelCondition => ({
  kind: "condition",
  id: overrides.id ?? "cond-id",
  label: overrides.label ?? "status",
  operator: overrides.operator ?? "$eq",
  value: overrides.value ?? "active",
});

const makeGroup = (
  overrides: Partial<ConditionGroup> = {},
): ConditionGroup => ({
  kind: "group",
  id: overrides.id ?? "group-id",
  operator: overrides.operator ?? "$and",
  children: overrides.children ?? [],
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

  describe("isLogicalOperator", () => {
    it("accepts $and, $or, $not", () => {
      expect(isLogicalOperator("$and")).toBe(true);
      expect(isLogicalOperator("$or")).toBe(true);
      expect(isLogicalOperator("$not")).toBe(true);
    });

    it("rejects label operators and unknown strings", () => {
      expect(isLogicalOperator("$eq")).toBe(false);
      expect(isLogicalOperator("$foo")).toBe(false);
    });
  });

  describe("serializeBuilderTree", () => {
    it("returns an empty object for a null tree", () => {
      expect(serializeBuilderTree(null)).toEqual({});
    });

    it("returns an empty object for a group with no children", () => {
      expect(serializeBuilderTree(makeGroup({ children: [] }))).toEqual({});
    });

    it("unwraps the root when it has a single condition in $and", () => {
      const tree = makeGroup({ children: [makeCondition()] });
      expect(serializeBuilderTree(tree)).toEqual({
        "&status": { $eq: "active" },
      });
    });

    it("sends a numeric-looking value as a real JSON number", () => {
      // A $gt/$lt comparison against a numeric label silently matches
      // nothing if the value is sent as a JSON string instead of a
      // number, so a value like "100" must be coerced to 100.
      const tree = makeGroup({
        children: [
          makeCondition({ label: "gps_z", operator: "$gt", value: "100" }),
        ],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        "&gps_z": { $gt: 100 },
      });
    });

    it("keeps a non-numeric value as text", () => {
      const tree = makeGroup({
        children: [makeCondition({ label: "status", value: "active" })],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        "&status": { $eq: "active" },
      });
    });

    it("wraps multiple root conditions in $and", () => {
      const tree = makeGroup({
        children: [
          makeCondition({ id: "a", label: "status", value: "active" }),
          makeCondition({
            id: "b",
            label: "count",
            operator: "$gt",
            value: "10",
          }),
        ],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        $and: [{ "&status": { $eq: "active" } }, { "&count": { $gt: 10 } }],
      });
    });

    it("wraps root conditions in $or when the root operator is $or", () => {
      const tree = makeGroup({
        operator: "$or",
        children: [makeCondition({ id: "a" }), makeCondition({ id: "b" })],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        $or: [
          { "&status": { $eq: "active" } },
          { "&status": { $eq: "active" } },
        ],
      });
    });

    it("serializes $not with a single child without wrapping in an array", () => {
      const tree = makeGroup({
        operator: "$not",
        children: [makeCondition()],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        $not: { "&status": { $eq: "active" } },
      });
    });

    it("serializes $not with several children wrapped in an implicit $and", () => {
      const tree = makeGroup({
        operator: "$not",
        children: [
          makeCondition({ id: "a" }),
          makeCondition({
            id: "b",
            label: "count",
            operator: "$gt",
            value: "10",
          }),
        ],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        $not: {
          $and: [{ "&status": { $eq: "active" } }, { "&count": { $gt: 10 } }],
        },
      });
    });

    it("serializes nested groups recursively", () => {
      const tree = makeGroup({
        id: "root",
        children: [
          makeCondition({ id: "a" }),
          makeGroup({
            id: "sub",
            operator: "$or",
            children: [
              makeCondition({
                id: "b",
                label: "method",
                operator: "$in",
                value: ["POST", "DELETE"],
              }),
            ],
          }),
        ],
      });
      expect(serializeBuilderTree(tree)).toEqual({
        $and: [
          { "&status": { $eq: "active" } },
          { $or: [{ "&method": { $in: ["POST", "DELETE"] } }] },
        ],
      });
    });
  });

  describe("parseBuilderTree", () => {
    it("treats an empty object as an empty tree", () => {
      expect(parseBuilderTree({})).toEqual({ success: true, tree: null });
    });

    it("treats a lone $each_t as an empty tree", () => {
      expect(parseBuilderTree({ $each_t: "$__interval" })).toEqual({
        success: true,
        tree: null,
      });
    });

    it("rejects $each_t combined with a real condition", () => {
      const result = parseBuilderTree({
        $each_t: "30s",
        "&status": { $eq: "active" },
      });
      expect(result.success).toBe(false);
    });

    it("wraps a single bare condition into a root $and group", () => {
      const result = parseBuilderTree({ "&status": { $eq: "active" } });
      expect(result.success).toBe(true);
      expect(result.tree?.operator).toBe("$and");
      expect(result.tree?.children).toEqual([
        expect.objectContaining({
          kind: "condition",
          label: "status",
          operator: "$eq",
          value: "active",
        }),
      ]);
    });

    it("parses a top-level $and group directly", () => {
      const result = parseBuilderTree({
        $and: [{ "&status": { $eq: "active" } }, { "&count": { $gt: "10" } }],
      });
      expect(result.success).toBe(true);
      expect(result.tree?.operator).toBe("$and");
      expect(result.tree?.children).toHaveLength(2);
    });

    it("rejects unknown operators", () => {
      expect(parseBuilderTree({ $xor: [{ "&a": { $eq: "1" } }] }).success).toBe(
        false,
      );
    });

    it("accepts a numeric comparison value and normalizes it to text", () => {
      const result = parseBuilderTree({ "&count": { $gt: 10 } });
      expect(result.success).toBe(true);
      expect(result.tree?.children).toEqual([
        expect.objectContaining({
          label: "count",
          operator: "$gt",
          value: "10",
        }),
      ]);
    });

    it("rejects a boolean comparison value", () => {
      expect(parseBuilderTree({ "&flag": { $eq: true } }).success).toBe(false);
    });

    it("rejects a computed label", () => {
      expect(parseBuilderTree({ "@computed": { $eq: "x" } }).success).toBe(
        false,
      );
    });

    it("rejects non-object input", () => {
      expect(parseBuilderTree("not json").success).toBe(false);
      expect(parseBuilderTree(42).success).toBe(false);
      expect(parseBuilderTree(null).success).toBe(false);
    });

    it("round-trips through serializeBuilderTree for and/or/not/nested trees", () => {
      const trees: BuilderTree[] = [
        null,
        makeGroup({ children: [makeCondition()] }),
        makeGroup({
          children: [makeCondition({ id: "a" }), makeCondition({ id: "b" })],
        }),
        makeGroup({
          id: "root",
          children: [
            makeCondition({ id: "a" }),
            makeGroup({
              id: "sub",
              operator: "$or",
              children: [makeCondition({ id: "b" })],
            }),
          ],
        }),
      ];

      const stripIds = (node: any): any => {
        if (node === null || typeof node !== "object") return node;
        const rest = { ...node };
        delete rest.id;
        if (rest.children) rest.children = rest.children.map(stripIds);
        return rest;
      };

      for (const tree of trees) {
        const json = serializeBuilderTree(tree);
        const result = parseBuilderTree(json);
        expect(result.success).toBe(true);
        expect(stripIds(result.tree)).toEqual(stripIds(tree));
      }
    });
  });

  describe("updateCondition", () => {
    it("updates the matching condition anywhere in the tree", () => {
      const tree = makeGroup({
        id: "root",
        children: [
          makeCondition({ id: "a" }),
          makeGroup({
            id: "sub",
            children: [makeCondition({ id: "b", label: "count" })],
          }),
        ],
      });

      const updated = updateCondition(tree, "b", { value: "99" });
      const subGroup = updated?.children[1] as ConditionGroup;
      const updatedCondition = subGroup.children[0] as LabelCondition;
      expect(updatedCondition.value).toBe("99");
    });

    it("does not mutate the original tree", () => {
      const tree = makeGroup({ children: [makeCondition({ id: "a" })] });
      updateCondition(tree, "a", { value: "changed" });
      expect((tree.children[0] as LabelCondition).value).toBe("active");
    });

    it("returns the tree unchanged when the id is not found", () => {
      const tree = makeGroup({ children: [makeCondition({ id: "a" })] });
      const result = updateCondition(tree, "missing", { value: "x" });
      expect(result).toEqual(tree);
    });

    it("returns null when the tree is null", () => {
      expect(updateCondition(null, "a", { value: "x" })).toBeNull();
    });
  });

  describe("removeNode", () => {
    it("removes a condition nested inside a sub-group", () => {
      const tree = makeGroup({
        id: "root",
        children: [
          makeCondition({ id: "a" }),
          makeGroup({
            id: "sub",
            children: [makeCondition({ id: "b" }), makeCondition({ id: "c" })],
          }),
        ],
      });

      const result = removeNode(tree, "b");
      const subGroup = result?.children[1] as ConditionGroup;
      expect(subGroup.children).toHaveLength(1);
      expect((subGroup.children[0] as LabelCondition).id).toBe("c");
    });

    it("returns null when removing the root itself", () => {
      const tree = makeGroup({ id: "root", children: [makeCondition()] });
      expect(removeNode(tree, "root")).toBeNull();
    });

    it("returns null when the tree is null", () => {
      expect(removeNode(null, "a")).toBeNull();
    });
  });

  describe("addCondition", () => {
    it("creates a new root with one empty condition when the tree is null", () => {
      const result = addCondition(null, null);
      expect(result?.operator).toBe("$and");
      expect(result?.children).toHaveLength(1);
      expect(result?.children[0]).toEqual(
        expect.objectContaining({
          kind: "condition",
          label: "",
          operator: "$eq",
          value: "",
        }),
      );
    });

    it("appends to the root when groupId is null", () => {
      const tree = makeGroup({
        id: "root",
        children: [makeCondition({ id: "a" })],
      });
      const result = addCondition(tree, null);
      expect(result?.children).toHaveLength(2);
    });

    it("appends to a specific nested group by id", () => {
      const tree = makeGroup({
        id: "root",
        children: [
          makeCondition({ id: "a" }),
          makeGroup({ id: "sub", children: [] }),
        ],
      });
      const result = addCondition(tree, "sub");
      const subGroup = result?.children[1] as ConditionGroup;
      expect(subGroup.children).toHaveLength(1);
    });
  });

  describe("addGroup", () => {
    it("creates a new group containing one empty condition", () => {
      const tree = makeGroup({
        id: "root",
        children: [makeCondition({ id: "a" })],
      });
      const result = addGroup(tree, "root");
      const newGroup = result?.children[1] as ConditionGroup;
      expect(newGroup.kind).toBe("group");
      expect(newGroup.operator).toBe("$and");
      expect(newGroup.children).toHaveLength(1);
      expect(newGroup.children[0]).toEqual(
        expect.objectContaining({ kind: "condition", label: "" }),
      );
    });

    it("creates a root containing the new group when the tree is null", () => {
      const result = addGroup(null, null);
      expect(result?.children).toHaveLength(1);
      expect(result?.children[0].kind).toBe("group");
    });
  });

  describe("updateGroupOperator", () => {
    it("changes the operator of the targeted group only", () => {
      const tree = makeGroup({
        id: "root",
        operator: "$and",
        children: [
          makeGroup({
            id: "sub",
            operator: "$and",
            children: [makeCondition()],
          }),
        ],
      });
      const result = updateGroupOperator(tree, "sub", "$or");
      expect(result?.operator).toBe("$and");
      expect((result?.children[0] as ConditionGroup).operator).toBe("$or");
    });

    it("returns null when the tree is null", () => {
      expect(updateGroupOperator(null, "root", "$or")).toBeNull();
    });
  });
});
