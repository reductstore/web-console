import {
  addCondition,
  addEachNStep,
  addEachTStep,
  addLimitStep,
  addSampleStep,
  EachNStepEntry,
  EachTStepEntry,
  FlatCondition,
  hasIncompleteSteps,
  isLabelOperator,
  isValidEachTDuration,
  LimitStepEntry,
  moveItem,
  parseBuilderList,
  removeCondition,
  removeStep,
  serializeBuilderList,
  serializeSteps,
  Step,
  switchSampleKind,
  updateCondition,
  updateEachNStep,
  updateEachTStep,
  updateLimitStep,
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

const findEachN = (steps?: Step[]) =>
  steps?.find((step): step is EachNStepEntry => step.type === "each_n");
const findEachT = (steps?: Step[]) =>
  steps?.find((step): step is EachTStepEntry => step.type === "each_t");
const findLimit = (steps?: Step[]) =>
  steps?.find((step): step is LimitStepEntry => step.type === "limit");

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

  describe("isValidEachTDuration", () => {
    it("accepts a single unit for each supported unit", () => {
      ["30s", "500ms", "10us", "5m", "2h", "1d"].forEach((duration) =>
        expect(isValidEachTDuration(duration)).toBe(true),
      );
    });

    it("accepts a decimal value", () => {
      expect(isValidEachTDuration("1.5s")).toBe(true);
    });

    it("accepts combined units separated by whitespace", () => {
      expect(isValidEachTDuration("1d 2h")).toBe(true);
    });

    it("accepts surrounding whitespace", () => {
      expect(isValidEachTDuration("  30s  ")).toBe(true);
    });

    it("rejects a bare number with no unit", () => {
      expect(isValidEachTDuration("30")).toBe(false);
    });

    it("rejects an unknown unit", () => {
      expect(isValidEachTDuration("30x")).toBe(false);
    });

    it("rejects non-numeric text", () => {
      expect(isValidEachTDuration("abc")).toBe(false);
    });

    it("rejects an empty string", () => {
      expect(isValidEachTDuration("")).toBe(false);
    });
  });

  describe("moveItem", () => {
    it("moves an item forward in the list", () => {
      expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    });

    it("moves an item backward in the list", () => {
      expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    });

    it("does not mutate the original list", () => {
      const list = ["a", "b", "c"];
      moveItem(list, 0, 2);
      expect(list).toEqual(["a", "b", "c"]);
    });

    it("is a no-op when the index doesn't change", () => {
      expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
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

    it("treats a lone $each_t as an empty list and surfaces it as its own step", () => {
      const result = parseBuilderList({ $each_t: "$__interval" });
      expect(result.success).toBe(true);
      expect(result.list).toEqual([]);
      expect(findEachT(result.steps)?.eachT).toEqual({
        duration: "",
        useIntervalMacro: true,
      });
    });

    it("parses a real condition combined with $each_t, surfacing both", () => {
      const result = parseBuilderList({
        $each_t: "30s",
        "&status": { $eq: "active" },
      });
      expect(result.success).toBe(true);
      expect(findEachT(result.steps)?.eachT).toEqual({
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
      expect(findEachT(result.steps)?.eachT).toEqual({
        duration: "",
        useIntervalMacro: true,
      });
      expect(result.list?.map((c) => c.label)).toEqual(["status", "count"]);
    });

    it("parses $each_n as its own step", () => {
      const result = parseBuilderList({ $each_n: 5 });
      expect(result.success).toBe(true);
      expect(findEachN(result.steps)?.eachN).toEqual({ everyNth: 5 });
    });

    it("parses $limit as a limit step", () => {
      const result = parseBuilderList({ $limit: 100 });
      expect(result.success).toBe(true);
      expect(findLimit(result.steps)?.limit).toEqual({ count: 100 });
    });

    it("parses filters combined with an each_t step and a limit step", () => {
      const result = parseBuilderList({
        "&status": { $eq: "active" },
        $each_t: "30s",
        $limit: 50,
      });
      expect(result.success).toBe(true);
      expect(result.list).toHaveLength(1);
      expect(findEachT(result.steps)?.eachT).toEqual({
        duration: "30s",
        useIntervalMacro: false,
      });
      expect(findLimit(result.steps)?.limit).toEqual({ count: 50 });
    });

    it("parses $each_n and $each_t present together into two independent steps", () => {
      // ReductStore allows combining both directives (e.g. thin to every
      // 20th record, then also throttle to at most one per second) - they
      // used to be mutually exclusive kinds of one "Sample" step, but are
      // now fully independent, like $limit.
      const result = parseBuilderList({ $each_n: 20, $each_t: "1s" });
      expect(result.success).toBe(true);
      expect(findEachN(result.steps)?.eachN).toEqual({ everyNth: 20 });
      expect(findEachT(result.steps)?.eachT).toEqual({
        duration: "1s",
        useIntervalMacro: false,
      });
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

    it("parses a null $each_n as a blank step instead of rejecting it", () => {
      // This is exactly what serializeSteps emits for an $each_n step that
      // was added but not filled in yet, so it must round-trip back into
      // Builder mode rather than being treated as malformed.
      const result = parseBuilderList({ $each_n: null });
      expect(result.success).toBe(true);
      expect(findEachN(result.steps)?.eachN).toEqual({ everyNth: undefined });
    });

    it("parses a null $limit as a blank limit step instead of rejecting it", () => {
      const result = parseBuilderList({ $limit: null });
      expect(result.success).toBe(true);
      expect(findLimit(result.steps)?.limit).toEqual({ count: undefined });
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
    it("adds an each_n step defaulting to a count of 2", () => {
      const result = addEachNStep([]);
      expect(findEachN(result)?.eachN).toEqual({ everyNth: 2 });
    });

    it("adds an each_t step defaulting to the interval macro", () => {
      const result = addEachTStep([]);
      expect(findEachT(result)?.eachT).toEqual({
        duration: "",
        useIntervalMacro: true,
      });
    });

    it("adds a limit step defaulting to a count of 100", () => {
      const result = addLimitStep([]);
      expect(findLimit(result)?.limit).toEqual({ count: 100 });
    });

    it("keeps the other steps untouched when adding one", () => {
      const steps: Step[] = [
        { id: "limit-1", type: "limit", limit: { count: 10 } },
      ];
      const result = addEachTStep(addEachNStep(steps));
      expect(findLimit(result)?.limit).toEqual({ count: 10 });
      expect(findEachN(result)).toBeDefined();
      expect(findEachT(result)).toBeDefined();
    });

    it("does not mutate the original steps array when adding", () => {
      const steps: Step[] = [];
      addEachNStep(steps);
      expect(steps).toEqual([]);
    });

    it("updates the each_n step's fields", () => {
      const steps = addEachNStep([]);
      const result = updateEachNStep(steps, findEachN(steps)!.id, {
        everyNth: 5,
      });
      expect(findEachN(result)?.eachN).toEqual({ everyNth: 5 });
    });

    it("returns the array unchanged when updating an each_n step that isn't there", () => {
      const steps: Step[] = [];
      expect(updateEachNStep(steps, "missing", { everyNth: 5 })).toEqual(steps);
    });

    it("updates the each_t step's fields", () => {
      const steps = addEachTStep([]);
      const result = updateEachTStep(steps, findEachT(steps)!.id, {
        duration: "30s",
        useIntervalMacro: false,
      });
      expect(findEachT(result)?.eachT).toEqual({
        duration: "30s",
        useIntervalMacro: false,
      });
    });

    it("updates the limit step's count", () => {
      const steps = addLimitStep([]);
      const result = updateLimitStep(steps, findLimit(steps)!.id, {
        count: 100,
      });
      expect(findLimit(result)?.limit).toEqual({ count: 100 });
    });

    it("removes one step while keeping the others", () => {
      const steps = addLimitStep(addEachTStep(addEachNStep([])));
      const result = removeStep(steps, findEachN(steps)!.id);
      expect(findEachN(result)).toBeUndefined();
      expect(findEachT(result)).toBeDefined();
      expect(findLimit(result)?.limit).toEqual({ count: 100 });
    });

    describe("addSampleStep", () => {
      it("adds an each_t step when neither kind is present yet", () => {
        const result = addSampleStep([]);
        expect(findEachT(result)?.eachT).toEqual({
          duration: "",
          useIntervalMacro: true,
        });
        expect(findEachN(result)).toBeUndefined();
      });

      it("adds an each_n step when each_t is already present", () => {
        const steps = addEachTStep([]);
        const result = addSampleStep(steps);
        expect(findEachN(result)?.eachN).toEqual({ everyNth: 2 });
        expect(findEachT(result)).toBeDefined();
      });

      it("is a no-op when both kinds are already present", () => {
        const steps = addEachNStep(addEachTStep([]));
        expect(addSampleStep(steps)).toEqual(steps);
      });
    });

    describe("switchSampleKind", () => {
      it("switches an each_t step to each_n, keeping the same id", () => {
        const steps = addEachTStep([]);
        const { id } = findEachT(steps)!;
        const result = switchSampleKind(steps, id, "each_n");
        expect(findEachT(result)).toBeUndefined();
        expect(findEachN(result)).toEqual({
          id,
          type: "each_n",
          eachN: { everyNth: 2 },
        });
      });

      it("switches an each_n step to each_t, defaulting to the interval macro", () => {
        const steps = addEachNStep([]);
        const { id } = findEachN(steps)!;
        const result = switchSampleKind(steps, id, "each_t");
        expect(findEachN(result)).toBeUndefined();
        expect(findEachT(result)).toEqual({
          id,
          type: "each_t",
          eachT: { duration: "", useIntervalMacro: true },
        });
      });

      it("leaves other steps untouched", () => {
        const steps = addLimitStep(addEachTStep([]));
        const { id } = findEachT(steps)!;
        const result = switchSampleKind(steps, id, "each_n");
        expect(findLimit(result)?.limit).toEqual({ count: 100 });
      });
    });

    describe("hasIncompleteSteps", () => {
      it("is false when there are no steps", () => {
        expect(hasIncompleteSteps([])).toBe(false);
      });

      it("is false right after adding an each_t step, since it defaults to the interval macro", () => {
        expect(hasIncompleteSteps(addEachTStep([]))).toBe(false);
      });

      it("is true for an each_t step with no duration and no macro", () => {
        const steps = addEachTStep([]);
        const result = updateEachTStep(steps, findEachT(steps)!.id, {
          useIntervalMacro: false,
        });
        expect(hasIncompleteSteps(result)).toBe(true);
      });

      it("is true for an each_t step with a malformed duration", () => {
        const steps = addEachTStep([]);
        const result = updateEachTStep(steps, findEachT(steps)!.id, {
          duration: "not-a-duration",
          useIntervalMacro: false,
        });
        expect(hasIncompleteSteps(result)).toBe(true);
      });

      it("is false for an each_t step with a valid duration", () => {
        const steps = addEachTStep([]);
        const result = updateEachTStep(steps, findEachT(steps)!.id, {
          duration: "1d 2h",
          useIntervalMacro: false,
        });
        expect(hasIncompleteSteps(result)).toBe(false);
      });

      it("is true for an each_n step with no count typed", () => {
        const steps: Step[] = [{ id: "each-n-1", type: "each_n", eachN: {} }];
        expect(hasIncompleteSteps(steps)).toBe(true);
      });

      it("is false right after adding an each_n step, since it defaults to a count", () => {
        expect(hasIncompleteSteps(addEachNStep([]))).toBe(false);
      });

      it("is false right after adding a limit step, since it defaults to a count", () => {
        expect(hasIncompleteSteps(addLimitStep([]))).toBe(false);
      });

      it("is true for a limit step whose count is cleared", () => {
        const steps = addLimitStep([]);
        const result = updateLimitStep(steps, findLimit(steps)!.id, {
          count: undefined,
        });
        expect(hasIncompleteSteps(result)).toBe(true);
      });

      it("is true if any one of multiple steps is incomplete", () => {
        const steps = addLimitStep(addEachTStep(addEachNStep([])));
        const result = updateEachNStep(steps, findEachN(steps)!.id, {
          everyNth: undefined,
        });
        expect(hasIncompleteSteps(result)).toBe(true);
      });
    });

    describe("serializeSteps", () => {
      it("returns an empty object when there are no steps", () => {
        expect(serializeSteps([])).toEqual({});
      });

      it("serializes an each_n step", () => {
        const steps = addEachNStep([]);
        const result = updateEachNStep(steps, findEachN(steps)!.id, {
          everyNth: 5,
        });
        expect(serializeSteps(result)).toEqual({ $each_n: 5 });
      });

      it("serializes an each_t step using the interval macro", () => {
        expect(serializeSteps(addEachTStep([]))).toEqual({
          $each_t: "$__interval",
        });
      });

      it("serializes an each_t step with a literal duration", () => {
        const steps = addEachTStep([]);
        const result = updateEachTStep(steps, findEachT(steps)!.id, {
          useIntervalMacro: false,
          duration: "30s",
        });
        expect(serializeSteps(result)).toEqual({ $each_t: "30s" });
      });

      it("shows an incomplete each_t step with an empty value instead of omitting it", () => {
        const steps = addEachTStep([]);
        const result = updateEachTStep(steps, findEachT(steps)!.id, {
          useIntervalMacro: false,
        });
        expect(serializeSteps(result)).toEqual({ $each_t: "" });
      });

      it("serializes a freshly added limit step with its default count", () => {
        expect(serializeSteps(addLimitStep([]))).toEqual({ $limit: 100 });
      });

      it("shows an incomplete each_n step with a null value", () => {
        const steps: Step[] = [{ id: "each-n-1", type: "each_n", eachN: {} }];
        expect(serializeSteps(steps)).toEqual({ $each_n: null });
      });

      it("round-trips an incomplete each_n or limit step back through parseBuilderList", () => {
        // A step saved mid-edit (e.g. via the Save button, which isn't
        // gated on completeness) must reopen in Builder mode, not be
        // rejected as unrepresentable just because its value is still null.
        const eachNSteps: Step[] = [
          { id: "each-n-1", type: "each_n", eachN: {} },
        ];
        const eachNResult = parseBuilderList(serializeSteps(eachNSteps));
        expect(eachNResult.success).toBe(true);

        const limitSteps = addLimitStep([]);
        const blankLimitSteps = updateLimitStep(
          limitSteps,
          findLimit(limitSteps)!.id,
          { count: undefined },
        );
        const limitResult = parseBuilderList(serializeSteps(blankLimitSteps));
        expect(limitResult.success).toBe(true);
      });

      it("serializes each_n, each_t, and a limit step together", () => {
        const withEachN = addEachNStep([]);
        const withEachT = addEachTStep(withEachN);
        const withLimit = addLimitStep(withEachT);
        const result = updateLimitStep(withLimit, findLimit(withLimit)!.id, {
          count: 100,
        });
        expect(serializeSteps(result)).toEqual({
          $each_n: 2,
          $each_t: "$__interval",
          $limit: 100,
        });
      });
    });
  });
});
