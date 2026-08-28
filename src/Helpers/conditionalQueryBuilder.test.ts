import {
  addCondition,
  addLimitStep,
  addSampleStep,
  FlatCondition,
  hasIncompleteSteps,
  isLabelOperator,
  parseBuilderList,
  QuerySteps,
  removeCondition,
  removeLimitStep,
  removeSampleStep,
  serializeBuilderList,
  serializeSteps,
  updateCondition,
  updateLimitStep,
  updateSampleStep,
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

    it("omits a blank placeholder row with no label", () => {
      expect(
        serializeBuilderList([makeCondition({ label: "", value: "" })]),
      ).toEqual({});
    });

    it("omits a row with a label but no value yet", () => {
      expect(
        serializeBuilderList([makeCondition({ label: "gps_z", value: "" })]),
      ).toEqual({});
    });

    it("omits a multi-value row whose values are all blank", () => {
      expect(
        serializeBuilderList([
          makeCondition({ label: "method", operator: "$in", value: [""] }),
        ]),
      ).toEqual({});
    });

    it("omits a blank row but keeps the rest of the chain", () => {
      expect(
        serializeBuilderList([
          makeCondition({ label: "status", value: "active" }),
          makeCondition({
            label: "",
            value: "",
            connector: "$or",
            id: "cond-2",
          }),
        ]),
      ).toEqual({ "&status": { $eq: "active" } });
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

    it("treats a lone $each_t as an empty list and surfaces it as a sample step", () => {
      expect(parseBuilderList({ $each_t: "$__interval" })).toEqual({
        success: true,
        list: [],
        steps: {
          sample: { kind: "$each_t", duration: "", useIntervalMacro: true },
        },
      });
    });

    it("parses a real condition combined with $each_t, surfacing both", () => {
      const result = parseBuilderList({
        $each_t: "30s",
        "&status": { $eq: "active" },
      });
      expect(result.success).toBe(true);
      expect(result.steps?.sample).toEqual({
        kind: "$each_t",
        duration: "30s",
        useIntervalMacro: false,
      });
      expect(result.list).toEqual([
        expect.objectContaining({
          label: "status",
          operator: "$eq",
          value: "active",
        }),
      ]);
    });

    it("parses a chain of conditions combined with $each_t, matching what the builder actually saves", () => {
      // This is the exact shape QueryConditionBuilder's applyQuery produces:
      // serializeBuilderList's output with the steps spread alongside it.
      const serialized = serializeBuilderList([
        makeCondition({ id: "a", label: "status" }),
        makeCondition({ id: "b", label: "count", connector: "$and" }),
      ]);
      const result = parseBuilderList({
        ...serialized,
        $each_t: "$__interval",
      });
      expect(result.success).toBe(true);
      expect(result.steps?.sample).toEqual({
        kind: "$each_t",
        duration: "",
        useIntervalMacro: true,
      });
      expect(result.list?.map((c) => c.label)).toEqual(["status", "count"]);
    });

    it("parses $each_n as a sample step", () => {
      const result = parseBuilderList({ $each_n: 5 });
      expect(result.success).toBe(true);
      expect(result.steps?.sample).toEqual({
        kind: "$each_n",
        everyNth: 5,
        duration: "",
        useIntervalMacro: false,
      });
    });

    it("parses $limit as a limit step", () => {
      const result = parseBuilderList({ $limit: 100 });
      expect(result.success).toBe(true);
      expect(result.steps?.limit).toEqual({ count: 100 });
    });

    it("parses filters combined with a sample step and a limit step", () => {
      const result = parseBuilderList({
        "&status": { $eq: "active" },
        $each_t: "30s",
        $limit: 50,
      });
      expect(result.success).toBe(true);
      expect(result.list).toHaveLength(1);
      expect(result.steps?.sample).toEqual({
        kind: "$each_t",
        duration: "30s",
        useIntervalMacro: false,
      });
      expect(result.steps?.limit).toEqual({ count: 50 });
    });

    it("rejects $each_n and $each_t present together", () => {
      expect(parseBuilderList({ $each_n: 5, $each_t: "30s" }).success).toBe(
        false,
      );
    });

    it("rejects a non-numeric $each_n", () => {
      expect(parseBuilderList({ $each_n: "5" }).success).toBe(false);
    });

    it("rejects a non-string $each_t", () => {
      expect(parseBuilderList({ $each_t: 30 }).success).toBe(false);
    });

    it("rejects a non-numeric $limit", () => {
      expect(parseBuilderList({ $limit: "100" }).success).toBe(false);
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

    it("rejects an array value for a single-value operator", () => {
      expect(
        parseBuilderList({ "&status": { $eq: ["active", "idle"] } }).success,
      ).toBe(false);
    });

    it("rejects a scalar value for a multi-value operator", () => {
      expect(parseBuilderList({ "&status": { $in: "active" } }).success).toBe(
        false,
      );
    });

    it("accepts an array value for a multi-value operator", () => {
      const result = parseBuilderList({
        "&status": { $in: ["active", "idle"] },
      });
      expect(result.success).toBe(true);
      expect(result.list).toEqual([
        expect.objectContaining({
          label: "status",
          operator: "$in",
          value: ["active", "idle"],
        }),
      ]);
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

  describe("query steps", () => {
    it("adds a blank sample step requiring an explicit value", () => {
      const result = addSampleStep({});
      expect(result.sample).toEqual({
        kind: "$each_t",
        duration: "",
        useIntervalMacro: false,
      });
    });

    it("adds a blank limit step", () => {
      const result = addLimitStep({});
      expect(result.limit).toEqual({ count: undefined });
    });

    it("keeps the other step untouched when adding one", () => {
      const steps: QuerySteps = { limit: { count: 10 } };
      const result = addSampleStep(steps);
      expect(result.limit).toEqual({ count: 10 });
      expect(result.sample).toBeDefined();
    });

    it("does not mutate the original steps object when adding", () => {
      const steps: QuerySteps = {};
      addSampleStep(steps);
      expect(steps).toEqual({});
    });

    it("updates the sample step's fields", () => {
      const steps = addSampleStep({});
      const result = updateSampleStep(steps, {
        kind: "$each_n",
        everyNth: 5,
      });
      expect(result.sample).toEqual({
        kind: "$each_n",
        everyNth: 5,
        duration: "",
        useIntervalMacro: false,
      });
    });

    it("does nothing when updating a sample step that isn't there", () => {
      const steps: QuerySteps = {};
      expect(updateSampleStep(steps, { everyNth: 5 })).toBe(steps);
    });

    it("updates the limit step's count", () => {
      const steps = addLimitStep({});
      const result = updateLimitStep(steps, { count: 100 });
      expect(result.limit).toEqual({ count: 100 });
    });

    it("removes the sample step and keeps the limit step", () => {
      const steps = addLimitStep(addSampleStep({}));
      const result = removeSampleStep(steps);
      expect(result.sample).toBeUndefined();
      expect(result.limit).toEqual({ count: undefined });
    });

    it("removes the limit step and keeps the sample step", () => {
      const steps = addLimitStep(addSampleStep({}));
      const result = removeLimitStep(steps);
      expect(result.limit).toBeUndefined();
      expect(result.sample).toBeDefined();
    });

    describe("hasIncompleteSteps", () => {
      it("is false when there are no steps", () => {
        expect(hasIncompleteSteps({})).toBe(false);
      });

      it("is false for a sample step using the interval macro", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          useIntervalMacro: true,
        });
        expect(hasIncompleteSteps(steps)).toBe(false);
      });

      it("is true for an $each_n sample step with no count typed", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          kind: "$each_n",
        });
        expect(hasIncompleteSteps(steps)).toBe(true);
      });

      it("is true for an $each_t sample step with no duration and no macro", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          useIntervalMacro: false,
        });
        expect(hasIncompleteSteps(steps)).toBe(true);
      });

      it("is true for a limit step with no count typed", () => {
        expect(hasIncompleteSteps(addLimitStep({}))).toBe(true);
      });

      it("is false once the limit step has a count", () => {
        const steps = updateLimitStep(addLimitStep({}), { count: 50 });
        expect(hasIncompleteSteps(steps)).toBe(false);
      });
    });

    describe("serializeSteps", () => {
      it("returns an empty object when there are no steps", () => {
        expect(serializeSteps({})).toEqual({});
      });

      it("serializes an $each_n sample step", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          kind: "$each_n",
          everyNth: 5,
        });
        expect(serializeSteps(steps)).toEqual({ $each_n: 5 });
      });

      it("serializes an $each_t sample step using the interval macro", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          useIntervalMacro: true,
        });
        expect(serializeSteps(steps)).toEqual({
          $each_t: "$__interval",
        });
      });

      it("serializes an $each_t sample step with a literal duration", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          useIntervalMacro: false,
          duration: "30s",
        });
        expect(serializeSteps(steps)).toEqual({ $each_t: "30s" });
      });

      it("shows an incomplete sample or limit step with an empty value instead of omitting it", () => {
        expect(serializeSteps(addSampleStep({}))).toEqual({ $each_t: "" });
        expect(serializeSteps(addLimitStep({}))).toEqual({ $limit: null });
      });

      it("shows an incomplete $each_n sample step with a null value", () => {
        const steps = updateSampleStep(addSampleStep({}), {
          kind: "$each_n",
        });
        expect(serializeSteps(steps)).toEqual({ $each_n: null });
      });

      it("serializes a sample step and a limit step together", () => {
        const steps = addLimitStep(
          updateSampleStep(addSampleStep({}), { useIntervalMacro: true }),
        );
        const withLimit = updateLimitStep(steps, { count: 100 });
        expect(serializeSteps(withLimit)).toEqual({
          $each_t: "$__interval",
          $limit: 100,
        });
      });
    });
  });
});
