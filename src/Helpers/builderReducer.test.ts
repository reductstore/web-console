import { describe, expect, it } from "vitest";
import { builderReducer, BuilderState } from "./builderReducer";
import { FlatCondition } from "./conditionalQueryBuilder";
import {
  createRosTransformStep,
  createSelectTransformStep,
} from "./transformStepBuilder";

function emptyState(): BuilderState {
  return {
    conditions: [],
    steps: [],
    transforms: [],
    blockOrder: [],
    enabled: {},
    pendingStages: [],
  };
}

function condition(
  id: string,
  overrides: Partial<Omit<FlatCondition, "id">> = {},
): FlatCondition {
  return {
    id,
    label: "foo",
    operator: "$eq",
    value: "1",
    negated: false,
    connector: "$and",
    ...overrides,
  };
}

function stateWithRosAndSelect(): BuilderState {
  return {
    ...emptyState(),
    transforms: [createRosTransformStep(), createSelectTransformStep()],
  };
}

describe("builderReducer", () => {
  describe("condition/add", () => {
    it("appends an empty condition", () => {
      const state = builderReducer(emptyState(), {
        type: "condition/add",
        id: "new-condition",
      });
      expect(state.conditions).toHaveLength(1);
      expect(state.conditions[0]).toMatchObject({ label: "", value: "" });
    });

    it("leaves the other state fields untouched", () => {
      const initial: BuilderState = {
        ...emptyState(),
        blockOrder: ["conditions"],
      };
      const state = builderReducer(initial, {
        type: "condition/add",
        id: "new-condition",
      });
      expect(state.blockOrder).toBe(initial.blockOrder);
      expect(state.steps).toBe(initial.steps);
      expect(state.transforms).toBe(initial.transforms);
    });
  });

  describe("condition/remove", () => {
    it("removes the condition with the given id", () => {
      const initial: BuilderState = {
        ...emptyState(),
        conditions: [
          condition("a"),
          condition("b", { label: "bar", value: "2" }),
        ],
      };
      const state = builderReducer(initial, {
        type: "condition/remove",
        id: "a",
      });
      expect(state.conditions.map((c) => c.id)).toEqual(["b"]);
    });
  });

  describe("condition/change", () => {
    it("merges the changes into the matching condition", () => {
      const initial: BuilderState = {
        ...emptyState(),
        conditions: [condition("a")],
      };
      const state = builderReducer(initial, {
        type: "condition/change",
        id: "a",
        changes: { label: "renamed", value: "2" },
      });
      expect(state.conditions[0]).toMatchObject({
        id: "a",
        label: "renamed",
        value: "2",
        operator: "$eq",
      });
    });
  });

  describe("step/changeEachN", () => {
    it("merges the changes into the matching each_n step", () => {
      const initial: BuilderState = {
        ...emptyState(),
        steps: [{ id: "s1", type: "each_n", eachN: { everyNth: 2 } }],
      };
      const state = builderReducer(initial, {
        type: "step/changeEachN",
        id: "s1",
        changes: { everyNth: 5 },
      });
      expect(state.steps).toEqual([
        { id: "s1", type: "each_n", eachN: { everyNth: 5 } },
      ]);
    });
  });

  describe("step/changeEachT", () => {
    it("merges the changes into the matching each_t step", () => {
      const initial: BuilderState = {
        ...emptyState(),
        steps: [
          {
            id: "s1",
            type: "each_t",
            eachT: { duration: "1s", useIntervalMacro: false },
          },
        ],
      };
      const state = builderReducer(initial, {
        type: "step/changeEachT",
        id: "s1",
        changes: { duration: "5s" },
      });
      expect(state.steps).toEqual([
        {
          id: "s1",
          type: "each_t",
          eachT: { duration: "5s", useIntervalMacro: false },
        },
      ]);
    });
  });

  describe("step/changeLimit", () => {
    it("merges the changes into the matching limit step", () => {
      const initial: BuilderState = {
        ...emptyState(),
        steps: [{ id: "s1", type: "limit", limit: { count: 10 } }],
      };
      const state = builderReducer(initial, {
        type: "step/changeLimit",
        id: "s1",
        changes: { count: 20 },
      });
      expect(state.steps).toEqual([
        { id: "s1", type: "limit", limit: { count: 20 } },
      ]);
    });
  });

  describe("ros actions", () => {
    function ros(state: BuilderState) {
      const transform = state.transforms.find((t) => t.kind === "ros");
      if (!transform || transform.kind !== "ros") {
        throw new Error("expected a ros transform");
      }
      return transform.ros;
    }

    it("ros/addSection adds the section and leaves the select transform untouched", () => {
      const initial = stateWithRosAndSelect();
      const state = builderReducer(initial, {
        type: "ros/addSection",
        section: "filter",
        rowId: "new-row",
      });
      expect(ros(state).sections).toEqual(["filter"]);
      expect(state.transforms[1]).toBe(initial.transforms[1]);
    });

    it("ros/removeSection removes the section", () => {
      const initial = stateWithRosAndSelect();
      const withFilter = builderReducer(initial, {
        type: "ros/addSection",
        section: "filter",
        rowId: "new-row",
      });
      const state = builderReducer(withFilter, {
        type: "ros/removeSection",
        section: "filter",
      });
      expect(ros(state).sections).toEqual([]);
    });

    it("ros/changeTopic sets the topic", () => {
      const state = builderReducer(stateWithRosAndSelect(), {
        type: "ros/changeTopic",
        topic: "/imu/data",
      });
      expect(ros(state).topic).toBe("/imu/data");
    });

    it("ros/addEncodeRow appends an empty row", () => {
      const state = builderReducer(stateWithRosAndSelect(), {
        type: "ros/addEncodeRow",
        id: "new-row",
      });
      expect(ros(state).encode).toHaveLength(1);
    });

    it("ros/changeEncodeRow and ros/removeEncodeRow update/remove the matching row", () => {
      const withRow = builderReducer(stateWithRosAndSelect(), {
        type: "ros/addEncodeRow",
        id: "new-row",
      });
      const rowId = ros(withRow).encode[0].id;
      const changed = builderReducer(withRow, {
        type: "ros/changeEncodeRow",
        id: rowId,
        changes: { key: "topic", value: "/imu/data" },
      });
      expect(ros(changed).encode[0]).toMatchObject({
        key: "topic",
        value: "/imu/data",
      });
      const removed = builderReducer(changed, {
        type: "ros/removeEncodeRow",
        id: rowId,
      });
      expect(ros(removed).encode).toEqual([]);
    });

    it("transform/addAsLabelRow, transform/changeAsLabelRow and transform/removeAsLabelRow manage the ros transform's as-label rows", () => {
      const withRow = builderReducer(stateWithRosAndSelect(), {
        type: "transform/addAsLabelRow",
        kind: "ros",
        id: "new-row",
      });
      expect(ros(withRow).asLabel).toHaveLength(1);
      const rowId = ros(withRow).asLabel[0].id;
      const changed = builderReducer(withRow, {
        type: "transform/changeAsLabelRow",
        kind: "ros",
        id: rowId,
        changes: { key: "source" },
      });
      expect(ros(changed).asLabel[0]).toMatchObject({ key: "source" });
      const removed = builderReducer(changed, {
        type: "transform/removeAsLabelRow",
        kind: "ros",
        id: rowId,
      });
      expect(ros(removed).asLabel).toEqual([]);
    });

    it("ros/changeExport merges the export config", () => {
      const state = builderReducer(stateWithRosAndSelect(), {
        type: "ros/changeExport",
        changes: { format: "mcap" },
      });
      expect(ros(state).export).toMatchObject({ format: "mcap" });
    });
  });

  describe("select actions", () => {
    function select(state: BuilderState) {
      const transform = state.transforms.find((t) => t.kind === "select");
      if (!transform || transform.kind !== "select") {
        throw new Error("expected a select transform");
      }
      return transform.select;
    }

    it("select/changeSql sets the sql and leaves the ros transform untouched", () => {
      const initial = stateWithRosAndSelect();
      const sqlStepId = select(initial).sqlSteps[0].id;
      const state = builderReducer(initial, {
        type: "select/changeSql",
        id: sqlStepId,
        sql: "SELECT temp FROM ENTRY()",
      });
      expect(select(state).sqlSteps[0].sql).toBe("SELECT temp FROM ENTRY()");
      expect(state.transforms[0]).toBe(initial.transforms[0]);
    });

    it("select/addSqlStep appends a new sql step", () => {
      const initial = stateWithRosAndSelect();
      const state = builderReducer(initial, {
        type: "select/addSqlStep",
        id: "new-sql-step",
      });
      expect(select(state).sqlSteps).toHaveLength(2);
      expect(select(state).sqlSteps[1]).toMatchObject({
        id: "new-sql-step",
        sql: "",
      });
    });

    it("select/removeSqlStep removes the matching sql step", () => {
      const withTwo = builderReducer(stateWithRosAndSelect(), {
        type: "select/addSqlStep",
        id: "new-sql-step",
      });
      const firstId = select(withTwo).sqlSteps[0].id;
      const state = builderReducer(withTwo, {
        type: "select/removeSqlStep",
        id: firstId,
      });
      expect(select(state).sqlSteps).toHaveLength(1);
      expect(select(state).sqlSteps[0]).toMatchObject({
        id: "new-sql-step",
        sql: "",
      });
    });

    it("select/addFormatSection and select/removeFormatSection manage the format sections", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const withCsv = builderReducer(initial, {
        type: "select/addFormatSection",
        stepId,
        section: "csv",
        fieldId: "new-field",
      });
      expect(select(withCsv).sqlSteps[0].formatSections).toEqual(["csv"]);
      const removed = builderReducer(withCsv, {
        type: "select/removeFormatSection",
        stepId,
        section: "csv",
      });
      expect(select(removed).sqlSteps[0].formatSections).toEqual([]);
    });

    it("select/changeFormat switches the active input format", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const withCsv = builderReducer(initial, {
        type: "select/addFormatSection",
        stepId,
        section: "csv",
        fieldId: "new-field",
      });
      const state = builderReducer(withCsv, {
        type: "select/changeFormat",
        stepId,
        format: "json",
        fieldId: "new-field",
      });
      expect(select(state).sqlSteps[0].formatSections).toEqual(["json"]);
    });

    it("select/changeCsv merges the csv config", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const state = builderReducer(initial, {
        type: "select/changeCsv",
        stepId,
        changes: { hasHeaders: true },
      });
      expect(select(state).sqlSteps[0].csv).toMatchObject({
        hasHeaders: true,
      });
    });

    it("select/changeProtobuf merges the protobuf message name and schema", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const state = builderReducer(initial, {
        type: "select/changeProtobuf",
        stepId,
        changes: { messageName: "Msg" },
      });
      expect(select(state).sqlSteps[0].protobuf).toMatchObject({
        messageName: "Msg",
      });
    });

    it("select/addProtobufFieldRow, select/changeProtobufFieldRow and select/removeProtobufFieldRow manage protobuf field rows", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const withRow = builderReducer(initial, {
        type: "select/addProtobufFieldRow",
        stepId,
        id: "new-field",
      });
      expect(select(withRow).sqlSteps[0].protobuf.fields).toHaveLength(1);
      const rowId = select(withRow).sqlSteps[0].protobuf.fields[0].id;
      const changed = builderReducer(withRow, {
        type: "select/changeProtobufFieldRow",
        stepId,
        id: rowId,
        changes: { column: "temp", fieldId: "1" },
      });
      expect(select(changed).sqlSteps[0].protobuf.fields[0]).toMatchObject({
        column: "temp",
        fieldId: "1",
      });
      const removed = builderReducer(changed, {
        type: "select/removeProtobufFieldRow",
        stepId,
        id: rowId,
      });
      expect(select(removed).sqlSteps[0].protobuf.fields).toEqual([]);
    });

    it("select/changeExport merges the export config", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const state = builderReducer(initial, {
        type: "select/changeExport",
        stepId,
        changes: { format: "csv" },
      });
      expect(select(state).sqlSteps[0].export).toMatchObject({
        format: "csv",
      });
    });

    it("transform/addAsLabelRow, transform/changeAsLabelRow and transform/removeAsLabelRow manage the select transform's as-label rows", () => {
      const initial = stateWithRosAndSelect();
      const stepId = select(initial).sqlSteps[0].id;
      const withRow = builderReducer(initial, {
        type: "transform/addAsLabelRow",
        kind: "select",
        stepId,
        id: "new-row",
      });
      expect(select(withRow).sqlSteps[0].asLabel).toHaveLength(1);
      const rowId = select(withRow).sqlSteps[0].asLabel[0].id;
      const changed = builderReducer(withRow, {
        type: "transform/changeAsLabelRow",
        kind: "select",
        stepId,
        id: rowId,
        changes: { key: "source" },
      });
      expect(select(changed).sqlSteps[0].asLabel[0]).toMatchObject({
        key: "source",
      });
      const removed = builderReducer(changed, {
        type: "transform/removeAsLabelRow",
        kind: "select",
        stepId,
        id: rowId,
      });
      expect(select(removed).sqlSteps[0].asLabel).toEqual([]);
    });
  });

  describe("block actions", () => {
    it("block/removeConditions clears conditions and removes the block id", () => {
      const withConditions: BuilderState = {
        ...emptyState(),
        conditions: [condition("new-condition")],
        blockOrder: ["conditions"],
      };
      const state = builderReducer(withConditions, {
        type: "block/removeConditions",
      });
      expect(state.conditions).toEqual([]);
      expect(state.blockOrder).toEqual([]);
    });

    it("step/remove removes the step and its block id", () => {
      const withStep: BuilderState = {
        ...emptyState(),
        steps: [{ id: "new-step", type: "limit", limit: { count: 1000 } }],
        blockOrder: ["new-step"],
      };
      const state = builderReducer(withStep, {
        type: "step/remove",
        id: "new-step",
      });
      expect(state.steps).toEqual([]);
      expect(state.blockOrder).toEqual([]);
    });

    it("block/addTransform adds a ros transform and its block id", () => {
      const state = builderReducer(emptyState(), {
        type: "block/addTransform",
        kind: "ros",
      });
      expect(state.transforms).toHaveLength(1);
      expect(state.transforms[0].kind).toBe("ros");
      expect(state.blockOrder).toEqual(["process"]);
    });

    it("block/addTransform adds a select transform and its block id", () => {
      const state = builderReducer(emptyState(), {
        type: "block/addTransform",
        kind: "select",
      });
      expect(state.transforms).toHaveLength(1);
      expect(state.transforms[0].kind).toBe("select");
      expect(state.blockOrder).toEqual(["process"]);
    });

    it("block/addTransform doesn't add a second block id when the process block already exists", () => {
      const withRos = builderReducer(emptyState(), {
        type: "block/addTransform",
        kind: "ros",
      });
      const state = builderReducer(withRos, {
        type: "block/addTransform",
        kind: "select",
      });
      expect(state.transforms.map((t) => t.kind)).toEqual(["ros", "select"]);
      expect(state.blockOrder).toEqual(["process"]);
    });

    it("block/removeTransform keeps the process block id while the other kind remains", () => {
      const withBoth: BuilderState = {
        ...emptyState(),
        transforms: [createRosTransformStep(), createSelectTransformStep()],
        blockOrder: ["process"],
      };
      const state = builderReducer(withBoth, {
        type: "block/removeTransform",
        kind: "ros",
      });
      expect(state.transforms.map((t) => t.kind)).toEqual(["select"]);
      expect(state.blockOrder).toEqual(["process"]);
    });

    it("block/removeTransform drops the process block id once no transform remains", () => {
      const withRos: BuilderState = {
        ...emptyState(),
        transforms: [createRosTransformStep()],
        blockOrder: ["process"],
      };
      const state = builderReducer(withRos, {
        type: "block/removeTransform",
        kind: "ros",
      });
      expect(state.transforms).toEqual([]);
      expect(state.blockOrder).toEqual([]);
    });

    it("stage/add appends a pending stage with no kind chosen yet", () => {
      const state = builderReducer(emptyState(), {
        type: "stage/add",
        id: "new-stage",
      });
      expect(state.blockOrder).toEqual(["new-stage"]);
      expect(state.pendingStages).toEqual(["new-stage"]);
    });

    it("stage/removePending drops a pending stage before a kind is chosen", () => {
      const withPending = builderReducer(emptyState(), {
        type: "stage/add",
        id: "new-stage",
      });
      const state = builderReducer(withPending, {
        type: "stage/removePending",
        id: "new-stage",
      });
      expect(state.blockOrder).toEqual([]);
      expect(state.pendingStages).toEqual([]);
    });

    it("stage/insert adds a new pending stage right before the anchor", () => {
      const initial: BuilderState = {
        ...emptyState(),
        blockOrder: ["a", "b"],
      };
      const state = builderReducer(initial, {
        type: "stage/insert",
        id: "new-stage",
        anchorId: "b",
        position: "before",
      });
      expect(state.blockOrder).toEqual(["a", "new-stage", "b"]);
      expect(state.pendingStages).toEqual(["new-stage"]);
    });

    it("stage/insert adds a new pending stage right after the anchor", () => {
      const initial: BuilderState = {
        ...emptyState(),
        blockOrder: ["a", "b"],
      };
      const state = builderReducer(initial, {
        type: "stage/insert",
        id: "new-stage",
        anchorId: "a",
        position: "after",
      });
      expect(state.blockOrder).toEqual(["a", "new-stage", "b"]);
      expect(state.pendingStages).toEqual(["new-stage"]);
    });

    it("stage/insert appends at the end when the anchor id can't be found", () => {
      const initial: BuilderState = {
        ...emptyState(),
        blockOrder: ["a"],
      };
      const state = builderReducer(initial, {
        type: "stage/insert",
        id: "new-stage",
        anchorId: "missing",
        position: "after",
      });
      expect(state.blockOrder).toEqual(["a", "new-stage"]);
    });

    it("stage/setKind conditions replaces the pending id with the conditions sentinel", () => {
      const withPending = builderReducer(emptyState(), {
        type: "stage/add",
        id: "new-stage",
      });
      const state = builderReducer(withPending, {
        type: "stage/setKind",
        id: "new-stage",
        kind: "conditions",
      });
      expect(state.blockOrder).toEqual(["conditions"]);
      expect(state.pendingStages).toEqual([]);
      expect(state.conditions).toHaveLength(1);
    });

    it("stage/setKind ext replaces the pending id with the process sentinel and adds no transform yet", () => {
      const withPending = builderReducer(emptyState(), {
        type: "stage/add",
        id: "new-stage",
      });
      const state = builderReducer(withPending, {
        type: "stage/setKind",
        id: "new-stage",
        kind: "ext",
      });
      expect(state.blockOrder).toEqual(["process"]);
      expect(state.pendingStages).toEqual([]);
      expect(state.transforms).toEqual([]);
    });

    it("stage/setKind sample_each_n/sample_each_t/limit reuse the pending id as the step id", () => {
      for (const kind of ["sample_each_n", "sample_each_t", "limit"] as const) {
        const withPending = builderReducer(emptyState(), {
          type: "stage/add",
          id: "new-stage",
        });
        const state = builderReducer(withPending, {
          type: "stage/setKind",
          id: "new-stage",
          kind,
        });
        expect(state.blockOrder).toEqual(["new-stage"]);
        expect(state.pendingStages).toEqual([]);
        expect(state.steps).toHaveLength(1);
        expect(state.steps[0].id).toBe("new-stage");
      }
    });

    it("block/reorder moves the block id from one index to another", () => {
      const initial: BuilderState = {
        ...emptyState(),
        blockOrder: ["a", "b", "c"],
      };
      const state = builderReducer(initial, {
        type: "block/reorder",
        fromIndex: 0,
        toIndex: 2,
      });
      expect(state.blockOrder).toEqual(["b", "c", "a"]);
    });

    it("external/sync replaces the whole state", () => {
      const nextState: BuilderState = {
        conditions: [],
        steps: [],
        transforms: [],
        blockOrder: ["x"],
        enabled: {},
        pendingStages: [],
      };
      const state = builderReducer(emptyState(), {
        type: "external/sync",
        state: nextState,
      });
      expect(state).toBe(nextState);
    });
  });
});
