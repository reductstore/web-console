import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { Client } from "reduct-js";
import type { DragEndEvent } from "@dnd-kit/core";
import { v4 as uuidv4 } from "uuid";
import QueryConditionBuilder from "./QueryConditionBuilder";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { BuilderState } from "../../Helpers/builderReducer";

let capturedOnDragEnd: ((event: DragEndEvent) => void) | undefined;

vi.mock("@dnd-kit/core", async () => {
  const actual =
    await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    // Renders the real DndContext (so nested SortableContext/useSortable
    // still work) but also captures onDragEnd so tests can invoke it
    // directly - simulating a real pointer drag isn't feasible in jsdom.
    DndContext: (props: React.ComponentProps<typeof actual.DndContext>) => {
      capturedOnDragEnd = props.onDragEnd;
      return <actual.DndContext {...props} />;
    },
  };
});

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock("monaco-editor", () => ({}));
vi.mock("@reductstore/reduct-query-monaco", () => ({
  getCompletionProvider: () => ({}),
  getSqlCompletionProvider: () => ({}),
}));

vi.mock("uuid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("uuid")>();
  return { ...actual, v4: vi.fn(actual.v4) };
});

beforeEach(() => {
  mockJSDOM();
  capturedOnDragEnd = undefined;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const noop = () => {};

// Rows are hidden until a bucket and entry are selected, so most tests need
// this to exercise the builder at all.
const readyValidationContext = {
  client: {} as Client,
  bucket: "testBucket",
  entry: "testEntry",
};

// getInfo() is undefined on the plain readyValidationContext.client above,
// so it throws and the license note's "unknown yet" default (assume valid,
// don't nag) just sticks - fine for tests that don't care either way. These
// two give an explicit answer for the tests that do.
const noLicenseValidationContext = {
  ...readyValidationContext,
  client: {
    getInfo: vi.fn().mockResolvedValue({ license: undefined, usage: 0n }),
  } as unknown as Client,
};
const proLicenseValidationContext = {
  ...readyValidationContext,
  client: {
    getInfo: vi.fn().mockResolvedValue({
      license: {
        licensee: "test",
        invoice: "123",
        expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 365,
        plan: "Pro",
        deviceNumber: 1,
        diskQuota: 0,
        fingerprint: "abc",
      },
      usage: 0n,
    }),
  } as unknown as Client,
};

// Once a stage type dropdown has ever been opened, antd/rc-trigger keeps its
// popup mounted in the DOM (mid leave-animation forever, since jsdom never
// fires the animation-end event that would let it unmount) - so several
// dropdowns can be present at once. The one actually open carries no
// "-leave" class; every closed leftover does.
const openStageTypeDropdown = () => {
  const dropdowns = Array.from(
    document.querySelectorAll(".ant-select-dropdown"),
  );
  const open = dropdowns.filter((d) => !d.className.includes("-leave"));
  return open[open.length - 1] as HTMLElement;
};

// "+ Add stage" creates a blank stage with no type chosen yet; picking a
// kind from its own dropdown is what actually reveals its content.
const addStageOfKind = async (kindLabel: string) => {
  await act(async () => {
    fireEvent.click(screen.getByLabelText("Add stage"));
  });
  const selects = screen.getAllByLabelText("Stage type");
  await act(async () => {
    fireEvent.mouseDown(selects[selects.length - 1]);
  });
  await act(async () => {
    fireEvent.click(within(openStageTypeDropdown()).getByText(kindLabel));
  });
};

// Label filter is a stage like Sample/Limit - added on demand rather than
// shown by default.
const addWhereLabels = async () => addStageOfKind("&label");

const stageTypeOption = (label: string) =>
  within(openStageTypeDropdown())
    .getByText(label)
    .closest(".ant-select-item-option") as Element;

const openActionsMenu = () => {
  const menus = Array.from(document.querySelectorAll(".ant-dropdown"));
  return menus.filter((menu) => !menu.className.includes("-leave")).at(-1) as
    | HTMLElement
    | undefined;
};

describe("QueryConditionBuilder", () => {
  it("shows Query with no blocks for an empty value until one is added", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    expect(screen.getByText("Query")).toBeTruthy();
    expect(screen.queryByText("&label")).toBeNull();
    expect(screen.queryByPlaceholderText("value")).toBeNull();
  });

  it("reveals one empty condition row once Label filter is added from the menu", async () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    expect(screen.getByPlaceholderText("value")).toBeTruthy();
  });

  it("allows adding and viewing stages even before a bucket and entry are selected", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getByText("Query")).toBeTruthy();
    expect(screen.getByLabelText("Add stage")).not.toBeDisabled();
  });

  it("never silently queues stages while a bucket and entry aren't selected yet", () => {
    // The Data Explorer page defaults the query to a bare $each_t sample
    // stage before any bucket/entry is chosen, so it renders even while
    // !sourceReady.
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getAllByText(/^Stage \d+$/)).toHaveLength(1);

    rerender(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );

    // Once ready, still just the single default sample stage - none
    // silently added while the source wasn't picked yet.
    expect(screen.getAllByText(/^Stage \d+$/)).toHaveLength(1);
  });

  it("keeps a stage visible when the bucket/entry selection is lost, instead of hiding it", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );

    await addStageOfKind("$limit");
    expect(screen.getAllByText(/^Stage \d+$/)).toHaveLength(2);

    rerender(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getAllByText(/^Stage \d+$/)).toHaveLength(2);
  });

  it("shows the JSON editor with the current value in json mode", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="json"
        onUnrepresentable={noop}
      />,
    );
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      '{"&status": {"$eq": "active"}}',
    );
    expect(screen.queryByText("Query")).toBeNull();
  });

  it("resyncs conditions when value changes from outside while already in builder mode", () => {
    const { rerender } = render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");

    // Simulate a saved query being loaded while already in Builder mode
    // (the QuerySelector calls the parent's setter directly).
    rerender(
      <QueryConditionBuilder
        value={'{"&method": {"$eq": "GET"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );

    const labelInput = screen.getByRole("combobox", { name: "Label" });
    expect(labelInput).toHaveValue("method");
    expect(screen.getByPlaceholderText("value")).toHaveValue("GET");
  });

  it("calls onUnrepresentable when a value loaded in builder mode can't be flattened", () => {
    const onUnrepresentable = vi.fn();
    const { rerender } = render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={onUnrepresentable}
      />,
    );
    rerender(
      <QueryConditionBuilder
        value={
          '{"$and": [{"&a": {"$eq": "1"}}, {"$or": [{"&b": {"$eq": "2"}}, {"&c": {"$eq": "3"}}]}]}'
        }
        onChange={noop}
        mode="builder"
        onUnrepresentable={onUnrepresentable}
      />,
    );
    expect(onUnrepresentable).toHaveBeenCalled();
  });

  it("preserves $each_t across an edit instead of silently dropping it", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value={'{"$each_t": "$__interval"}'}
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      "&status": { $eq: "active" },
      $each_t: "$__interval",
    });
  });

  it("parses an existing condition into the builder", () => {
    render(
      <QueryConditionBuilder
        value={'{"&status": {"$eq": "active"}}'}
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    expect(labelInput).toHaveValue("status");
    expect(screen.getByPlaceholderText("value")).toHaveValue("active");
  });

  it("reports the serialized JSON when a condition is edited", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    expect(onChange).toHaveBeenCalled();
    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({ "&status": { $eq: "active" } });
  });

  it("fetches label suggestions from a sample of records", async () => {
    const bucket = {
      query: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { labels: { status: "active" } };
          yield { labels: { method: "GET" } };
        },
      }),
    };
    const client = {
      getBucket: vi.fn().mockResolvedValue(bucket),
    } as unknown as Client;

    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );

    await waitFor(() =>
      expect(client.getBucket).toHaveBeenCalledWith("testBucket"),
    );
    expect(bucket.query).toHaveBeenCalledWith(
      "testEntry",
      undefined,
      undefined,
      expect.objectContaining({ head: true, when: { $limit: 20 } }),
    );

    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.mouseDown(labelInput);
    expect(await screen.findByTitle("status")).toBeTruthy();
    expect(screen.getByTitle("method")).toBeTruthy();
  });

  it("does not throw when the label suggestion query fails", async () => {
    const client = {
      getBucket: vi.fn().mockRejectedValue(new Error("bucket unreachable")),
    } as unknown as Client;

    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );

    await waitFor(() =>
      expect(client.getBucket).toHaveBeenCalledWith("testBucket"),
    );
    expect(screen.getByText("Query")).toBeTruthy();
  });

  it("adds a chained condition with a connector when + is clicked", async () => {
    const onChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client: {} as Client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );
    await addWhereLabels();
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    // The "+" button stays disabled until the row it would chain off of has
    // both a label and a value.
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });

    fireEvent.click(screen.getByLabelText("Add condition"));
    // Comboboxes now: [0] the stage's own type select, [1] row1 label,
    // [2] row1 operator, [3] connector, [4] row2 label, [5] row2 operator.
    const combos = screen.getAllByRole("combobox");
    fireEvent.change(combos[4], { target: { value: "method" } });
    const [, row2Value] = screen.getAllByPlaceholderText("value");
    fireEvent.change(row2Value, { target: { value: "GET" } });

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [{ "&status": { $eq: "active" } }, { "&method": { $eq: "GET" } }],
    });
  });

  it("negates a chained condition by picking not from the connector dropdown", async () => {
    // The first row never has a connector/NOT control, so negation is only
    // reachable once a 2nd row exists.
    const onChange = vi.fn();
    const { container } = render(
      <QueryConditionBuilder
        value=""
        onChange={onChange}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={{
          client: {} as Client,
          bucket: "testBucket",
          entry: "testEntry",
        }}
      />,
    );
    await addWhereLabels();
    // The "+" button stays disabled until row 1 has both a label and a
    // value.
    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    fireEvent.click(screen.getByLabelText("Add condition"));

    // A blank row is omitted from the serialized query, so fill row 2 in
    // too before checking how it negates.
    // Comboboxes: [0] the stage's own type select, [1] row1 label,
    // [2] row1 operator, [3] connector, [4] row2 label, [5] row2 operator.
    const combos = screen.getAllByRole("combobox");
    fireEvent.change(combos[4], { target: { value: "flag" } });
    const [, row2Value] = screen.getAllByPlaceholderText("value");
    fireEvent.change(row2Value, { target: { value: "true" } });

    // Non-autocomplete selects in DOM order: the stage's own type select,
    // row1 operator, row2 connector, row2 operator.
    const [, , connectorSelect] = container.querySelectorAll(
      ".ant-select:not(.ant-select-auto-complete)",
    );
    fireEvent.mouseDown(connectorSelect as HTMLElement);
    fireEvent.click(screen.getByTitle("not"));

    const [lastCall] = onChange.mock.calls.at(-1) as [string];
    expect(JSON.parse(lastCall)).toEqual({
      $and: [
        { "&status": { $eq: "active" } },
        { $not: { "&flag": { $eq: "true" } } },
      ],
    });
  });

  it("never shows a connector or NOT control on the first row", async () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
      />,
    );
    await addWhereLabels();
    expect(screen.queryByText("and")).toBeNull();
    expect(screen.queryByText("not")).toBeNull();
  });

  it("shows the error message passed in while in builder mode", () => {
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        error="Fill in or remove the incomplete row before running the query."
        validationContext={readyValidationContext}
      />,
    );
    expect(
      screen.getByText(
        "Fill in or remove the incomplete row before running the query.",
      ),
    ).toBeTruthy();
  });

  it("reports an incomplete condition once only the label is filled in", async () => {
    const onIncompleteConditionChange = vi.fn();
    render(
      <QueryConditionBuilder
        value=""
        onChange={noop}
        mode="builder"
        onUnrepresentable={noop}
        validationContext={readyValidationContext}
        onIncompleteConditionChange={onIncompleteConditionChange}
      />,
    );
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

    await addWhereLabels();
    // A freshly revealed blank row isn't incomplete either - only a
    // partially filled one is.
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

    const labelInput = screen.getByRole("combobox", { name: "Label" });
    fireEvent.change(labelInput, { target: { value: "status" } });
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

    fireEvent.change(screen.getByPlaceholderText("value"), {
      target: { value: "active" },
    });
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
  });

  it("reports no incomplete condition while in json mode", () => {
    const onIncompleteConditionChange = vi.fn();
    render(
      <QueryConditionBuilder
        value={'{"&status'}
        onChange={noop}
        mode="json"
        onUnrepresentable={noop}
        onIncompleteConditionChange={onIncompleteConditionChange}
      />,
    );
    expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
  });

  describe("each_n/each_t/Limit steps", () => {
    it("adds a Sample step (each_t by default) and combines it with an existing filter", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("&label");
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await addStageOfKind("$each_t");
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $each_t: "30s",
      });
    });

    it("adds a Sample every N step directly and reports its count", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("$each_n");
      fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
        target: { value: "20" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({ $each_n: 20 });
    });

    it("adds each_t and each_n as two separate steps, matching the mandant's each_n+each_t example", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("$each_t");
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "1s" },
      });

      await addStageOfKind("$each_n");
      fireEvent.change(screen.getByPlaceholderText("every Nth record"), {
        target: { value: "20" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        $each_t: "1s",
        $each_n: 20,
      });
    });

    it("disables adding another $each_t/$each_n once one of each is already present", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("$each_t");
      await addStageOfKind("$each_n");

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add stage"));
      });
      const selects = screen.getAllByLabelText("Stage type");
      await act(async () => {
        fireEvent.mouseDown(selects[selects.length - 1]);
      });

      const eachTOption = stageTypeOption("$each_t");
      const eachNOption = stageTypeOption("$each_n");
      expect(eachTOption).toHaveClass("ant-select-item-option-disabled");
      expect(eachNOption).toHaveClass("ant-select-item-option-disabled");
    });

    it("adds a limit step and combines it with an existing filter", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("&label");
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await addStageOfKind("$limit");
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "100" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $limit: 100,
      });
    });

    it("adds both a Sample step and a limit step together", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("&label");
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      await addStageOfKind("$each_t");
      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });
      await addStageOfKind("$limit");
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).toEqual({
        "&status": { $eq: "active" },
        $each_t: "30s",
        $limit: 50,
      });
    });

    it("reorders the JSON's keys to match a drag-and-drop reorder of the blocks", async () => {
      // The UUID mock wraps the real implementation, so the test can read
      // back the generated id without changing runtime behavior.
      const uuidMock = vi.mocked(uuidv4);
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      const callsBeforeLabel = uuidMock.mock.results.length;
      await addStageOfKind("&label");
      const conditionBlockId = uuidMock.mock.results[callsBeforeLabel]
        .value as string;
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      const callsBeforeLimit = uuidMock.mock.results.length;
      await addStageOfKind("$limit");
      const limitStepId = uuidMock.mock.results[callsBeforeLimit]
        .value as string;
      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });

      const [beforeDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(beforeDrag))).toEqual([
        "&status",
        "$limit",
      ]);

      // Drag the Limit block above the Label filter block.
      act(() => {
        capturedOnDragEnd?.({
          active: { id: limitStepId },
          over: { id: conditionBlockId },
        } as DragEndEvent);
      });

      const [afterDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(afterDrag))).toEqual(["$limit", "&status"]);
    });

    it("reorders the JSON's ext key to match a drag-and-drop reorder involving the Transform block", async () => {
      const uuidMock = vi.mocked(uuidv4);
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      const callsBeforeLabel = uuidMock.mock.results.length;
      await addStageOfKind("&label");
      const conditionBlockId = uuidMock.mock.results[callsBeforeLabel]
        .value as string;
      const labelInput = screen.getByRole("combobox", { name: "Label" });
      fireEvent.change(labelInput, { target: { value: "status" } });
      fireEvent.change(screen.getByPlaceholderText("value"), {
        target: { value: "active" },
      });

      const callsBeforeExt = uuidMock.mock.results.length;
      await addStageOfKind("#ext");
      const extBlockId = uuidMock.mock.results[callsBeforeExt].value as string;
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add ROS or Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("ROS"));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Filter"));
      });
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/robot/odom" } },
      );

      const [beforeDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(beforeDrag))).toEqual(["&status", "#ext"]);

      // Drag the Process block above the Label filter block.
      act(() => {
        capturedOnDragEnd?.({
          active: { id: extBlockId },
          over: { id: conditionBlockId },
        } as DragEndEvent);
      });

      const [afterDrag] = onChange.mock.calls.at(-1) as [string];
      expect(Object.keys(JSON.parse(afterDrag))).toEqual(["#ext", "&status"]);
    });

    it("reports an incomplete step once its default count is cleared, and clears once refilled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );

      await addStageOfKind("$limit");
      // Limit defaults to a count of 1000, so adding it alone doesn't block
      // Run Query.
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("max records"), {
        target: { value: "50" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("reports an incomplete Sample step once its macro-based default is cleared, and clears once refilled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={{
            ...readyValidationContext,
            intervalValue: "30s",
          }}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );

      await addStageOfKind("$each_t");
      // Sample defaults to the interval macro, so adding it alone doesn't
      // block Run Query.
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);

      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
        target: { value: "30s" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("disables adding another $limit once one is already added, without affecting other kinds", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await addStageOfKind("$limit");

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add stage"));
      });
      const selects = screen.getAllByLabelText("Stage type");
      await act(async () => {
        fireEvent.mouseDown(selects[selects.length - 1]);
      });

      const limitOption = stageTypeOption("$limit");
      const eachTOption = stageTypeOption("$each_t");
      const eachNOption = stageTypeOption("$each_n");
      expect(limitOption).toHaveClass("ant-select-item-option-disabled");
      expect(eachTOption).not.toHaveClass("ant-select-item-option-disabled");
      expect(eachNOption).not.toHaveClass("ant-select-item-option-disabled");
    });

    it("disables adding another &label/#ext once one of each is already present", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await addStageOfKind("&label");
      await addStageOfKind("#ext");

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add stage"));
      });
      const selects = screen.getAllByLabelText("Stage type");
      await act(async () => {
        fireEvent.mouseDown(selects[selects.length - 1]);
      });

      const labelOption = stageTypeOption("&label");
      const extOption = stageTypeOption("#ext");
      expect(labelOption).toHaveClass("ant-select-item-option-disabled");
      expect(extOption).toHaveClass("ant-select-item-option-disabled");
    });

    it("disables Add stage once all 5 kinds are used, with a max-reached tooltip", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await addStageOfKind("&label");
      await addStageOfKind("#ext");
      await addStageOfKind("$each_n");
      await addStageOfKind("$each_t");
      await addStageOfKind("$limit");

      expect(screen.getByLabelText("Add stage")).toBeDisabled();

      fireEvent.mouseOver(screen.getByLabelText("Add stage"));
      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent(
          "Maximum of 5 stages reached",
        );
      });
    });

    it("disables the enable/disable toggle until a stage type is chosen", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add stage"));
      });
      expect(screen.getByLabelText("Disable stage")).toBeDisabled();

      const selects = screen.getAllByLabelText("Stage type");
      await act(async () => {
        fireEvent.mouseDown(selects[selects.length - 1]);
      });
      await act(async () => {
        fireEvent.click(within(openStageTypeDropdown()).getByText("$limit"));
      });
      expect(screen.getByLabelText("Disable stage")).not.toBeDisabled();
    });

    it("clearing the stage type through the select's own x reverts it to pending and disables the toggle again", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await addStageOfKind("$limit");
      expect(screen.getByLabelText("Disable stage")).not.toBeDisabled();

      fireEvent.click(document.querySelector(".ant-select-clear")!);

      expect(screen.getByLabelText("Disable stage")).toBeDisabled();
      expect(
        screen.getByText("Choose a stage type above to configure it."),
      ).toBeTruthy();
    });

    describe("default Sample step", () => {
      it("shows the default $each_t/$__interval step automatically, without needing to be added", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.getByText("Stage 1")).toBeTruthy();
      });

      it("preserves the default Sample step when a condition is edited", async () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        await addStageOfKind("&label");
        const labelInput = screen.getByRole("combobox", { name: "Label" });
        fireEvent.change(labelInput, { target: { value: "status" } });
        fireEvent.change(screen.getByPlaceholderText("value"), {
          target: { value: "active" },
        });

        const [lastCall] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(lastCall)).toEqual({
          "&status": { $eq: "active" },
          $each_t: "$__interval",
        });
      });

      it("keeps using the interval macro on the default Sample step, letting a typed duration override it", () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
          target: { value: "30s" },
        });
        const [afterDuration] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(afterDuration)).toEqual({ $each_t: "30s" });
      });

      it("fully removes sampling once the default step is removed via Delete stage", async () => {
        const onChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={onChange}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );

        await act(async () => {
          fireEvent.click(screen.getByLabelText("Stage actions"));
        });
        await act(async () => {
          fireEvent.click(within(openActionsMenu()!).getByText("Delete stage"));
        });

        expect(screen.queryByText("Stage 1")).toBeNull();
        const [lastCall] = onChange.mock.calls.at(-1) as [string];
        expect(JSON.parse(lastCall)).toEqual({});
      });

      it("does not report incomplete when typing a malformed duration - format errors are the API's to report", () => {
        const onIncompleteConditionChange = vi.fn();
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "$__interval"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
            onIncompleteConditionChange={onIncompleteConditionChange}
          />,
        );

        fireEvent.change(screen.getByRole("combobox", { name: "Interval" }), {
          target: { value: "30 s" },
        });

        expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
      });

      it("shows a non-default Sample step immediately, without needing to be added", () => {
        render(
          <QueryConditionBuilder
            value={'{"$each_t": "30s"}'}
            onChange={noop}
            mode="builder"
            onUnrepresentable={noop}
            validationContext={readyValidationContext}
          />,
        );
        expect(screen.getByText("Stage 1")).toBeTruthy();
        expect(screen.getByRole("combobox", { name: "Interval" })).toHaveValue(
          "30s",
        );
      });
    });
  });

  describe("Process (ROS) step", () => {
    const addTransformBlock = async () => {
      await addStageOfKind("#ext");
    };

    const addExtension = async (kind: "ROS" | "Select") => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add ROS or Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText(kind));
      });
    };

    const addSection = async (
      name: "Filter" | "Encode" | "As label" | "Export",
    ) => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText(name));
      });
    };

    it("shows Add extension until ROS or Select are chosen", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("#ext");
      expect(screen.getByLabelText("Add ROS or Select")).toBeTruthy();
      expect(screen.queryByText("ROS")).toBeNull();
      expect(screen.queryByText("Select")).toBeNull();
    });

    it("adds a fresh transform (no sections yet) via the menu", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      expect(screen.getByLabelText("Add option")).toBeTruthy();
      expect(
        screen.queryByPlaceholderText("optional ROS topic filter"),
      ).toBeNull();
    });

    it("removes ROS via its stage actions menu", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      await addSection("Filter");
      expect(
        screen.getByPlaceholderText("optional ROS topic filter"),
      ).toBeTruthy();

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      fireEvent.click(within(openActionsMenu()!).getByText("Remove ROS"));

      expect(
        screen.queryByPlaceholderText("optional ROS topic filter"),
      ).toBeNull();
      expect(screen.getByText("Add extension")).toBeTruthy();
    });

    it("drops #ext from onChange once ROS and Select are both empty again", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      await addSection("Filter");
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/robot/odom" } },
      );
      const [withContent] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(withContent)).toHaveProperty("#ext");

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      fireEvent.click(within(openActionsMenu()!).getByText("Remove ROS"));

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).not.toHaveProperty("#ext");
    });

    it("reports a typed topic and as_label mapping through onChange, merged as a #ext key", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      await addSection("Filter");
      fireEvent.change(
        screen.getByPlaceholderText("optional ROS topic filter"),
        { target: { value: "/robot/odom" } },
      );
      await addSection("As label");
      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "speed" },
      });
      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "data.speed" },
      });

      const lastValue = onChange.mock.calls.at(-1)?.[0] as string;
      const parsed = JSON.parse(lastValue);
      expect(parsed["#ext"][0].ros.extract).toMatchObject({
        topic: "/robot/odom",
        as_label: { speed: "data.speed" },
      });
    });

    it("reports an incomplete transform for a half-filled encode row, and clears once both sides are filled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      await addSection("Encode");

      fireEvent.change(screen.getByPlaceholderText("field (e.g. data)"), {
        target: { value: "data" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("encoding (e.g. jpeg)"), {
        target: { value: "jpeg" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("shows a transform carried in the value prop's #ext key, without needing to be added", () => {
      const value = JSON.stringify({
        "#ext": {
          ros: {
            extract: {
              topic: "/robot/odom",
              as_label: { speed: "data.speed" },
            },
          },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("ROS")).toBeTruthy();
      expect(
        screen.getByPlaceholderText("optional ROS topic filter"),
      ).toHaveValue("/robot/odom");
    });

    it("resyncs when the value prop's #ext key changes from outside while already in builder mode", () => {
      const { rerender } = render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.queryByText("Process")).toBeNull();

      const value = JSON.stringify({
        "#ext": {
          ros: {
            extract: {
              topic: "/robot/odom",
              as_label: { speed: "data.speed" },
            },
          },
        },
      });
      rerender(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("ROS")).toBeTruthy();
    });
  });

  describe("Process (Select) step", () => {
    const addTransformBlock = async () => {
      await addStageOfKind("#ext");
    };

    const addExtension = async (kind: "ROS" | "Select") => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add ROS or Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText(kind));
      });
    };

    const addSqlStep = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option for Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("SQL"));
      });
    };

    const addLabelMapping = async () => {
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option for Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("As label"));
      });
    };

    it("shows no SQL editor until Add is used, matching the empty ROS/Select shell", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      expect(screen.queryByTestId("monaco-editor")).toBeNull();
      expect(screen.getByLabelText("Add option for Select")).toBeTruthy();
    });

    it("shows the default SQL once a SQL step is added from the menu", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();
      expect(screen.getByTestId("monaco-editor")).toHaveValue(
        "SELECT * FROM ENTRY()\n",
      );
      expect(screen.queryByText("As label")).toBeNull();
    });

    it("removes Select via its stage actions menu", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();
      expect(screen.getByTestId("monaco-editor")).toBeTruthy();

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      fireEvent.click(within(openActionsMenu()!).getByText("Remove Select"));

      expect(screen.queryByTestId("monaco-editor")).toBeNull();
      expect(screen.getByText("Add extension")).toBeTruthy();
    });

    it("drops #ext from onChange once ROS and Select are both empty again", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();
      fireEvent.change(screen.getByTestId("monaco-editor"), {
        target: { value: "SELECT 1 FROM ENTRY()" },
      });
      const [withContent] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(withContent)).toHaveProperty("#ext");

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      fireEvent.click(within(openActionsMenu()!).getByText("Remove Select"));

      const [lastCall] = onChange.mock.calls.at(-1) as [string];
      expect(JSON.parse(lastCall)).not.toHaveProperty("#ext");
    });

    it("reports a typed sql and as_label mapping through onChange, merged as a #ext key", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();
      fireEvent.change(screen.getByTestId("monaco-editor"), {
        target: { value: "SELECT temp.value AS value FROM ENTRY()" },
      });
      await addLabelMapping();
      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "value" },
      });
      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "value" },
      });

      const lastValue = onChange.mock.calls.at(-1)?.[0] as string;
      const parsed = JSON.parse(lastValue);
      expect(parsed["#ext"][0].select).toMatchObject({
        sql: "SELECT temp.value AS value FROM ENTRY()",
        as_label: { value: "value" },
      });
    });

    it("reports a parquet input format and export config through onChange, merged as a #ext key", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option for Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Format"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Parquet"));
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText("Add option for Select"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Export"));
      });

      fireEvent.mouseDown(screen.getByLabelText("Export format"));
      fireEvent.click(screen.getByTitle("parquet"));

      fireEvent.change(screen.getByPlaceholderText("max rows"), {
        target: { value: "500" },
      });
      fireEvent.change(screen.getByPlaceholderText("max duration (e.g. 1m)"), {
        target: { value: "1m" },
      });

      const lastValue = onChange.mock.calls.at(-1)?.[0] as string;
      const parsed = JSON.parse(lastValue);
      expect(parsed["#ext"][0].select).toMatchObject({
        parquet: {},
        export: { format: "parquet", rows: 500, duration: "1m" },
      });
    });

    it("reports an incomplete transform for a half-filled as_label row, and clears once both sides are filled", async () => {
      const onIncompleteConditionChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
          onIncompleteConditionChange={onIncompleteConditionChange}
        />,
      );
      await addTransformBlock();
      await addExtension("Select");
      await addSqlStep();
      await addLabelMapping();

      fireEvent.change(screen.getByPlaceholderText("label name (e.g. lat_x)"), {
        target: { value: "value" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(true);

      fireEvent.change(screen.getByPlaceholderText("field (e.g. latitude.x)"), {
        target: { value: "value" },
      });
      expect(onIncompleteConditionChange).toHaveBeenLastCalledWith(false);
    });

    it("shows a transform carried in the value prop's #ext key, without needing to be added", () => {
      const value = JSON.stringify({
        "#ext": {
          select: {
            sql: "SELECT * FROM ENTRY()",
            as_label: { value: "value" },
          },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("Select")).toBeTruthy();
      expect(screen.getByText("SELECT * FROM ENTRY()")).toBeTruthy();
    });

    it("resyncs when the value prop's #ext key changes from outside while already in builder mode", () => {
      const { rerender } = render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.queryByText("Process")).toBeNull();

      const value = JSON.stringify({
        "#ext": {
          select: {
            sql: "SELECT * FROM ENTRY()",
            as_label: { value: "value" },
          },
        },
      });
      rerender(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("Select")).toBeTruthy();
    });

    it("renders both Process (ROS) and Process (Select) when #ext carries both", () => {
      const onUnrepresentable = vi.fn();
      const value = JSON.stringify({
        "#ext": {
          ros: { extract: {} },
          select: { sql: "SELECT * FROM ENTRY()" },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={onUnrepresentable}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByText("Stage 1")).toBeTruthy();
      const rosHeading = screen.getByText("ROS");
      const selectHeading = screen.getByText("Select");
      expect(
        rosHeading.compareDocumentPosition(selectHeading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(onUnrepresentable).not.toHaveBeenCalled();
    });

    it("offers to remove ROS and Select independently from the stage actions menu when #ext carries both", async () => {
      const value = JSON.stringify({
        "#ext": {
          ros: { extract: { topic: "/robot/odom" } },
          select: { sql: "SELECT * FROM ENTRY()" },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      let menu = within(openActionsMenu()!);
      expect(menu.getByText("Remove ROS")).toBeTruthy();
      expect(menu.getByText("Remove Select")).toBeTruthy();

      fireEvent.click(menu.getByText("Remove ROS"));
      expect(
        screen.queryByPlaceholderText("optional ROS topic filter"),
      ).toBeNull();
      expect(screen.getByText("Select")).toBeTruthy();
      expect(screen.getByText("Add extension")).toBeTruthy();

      await act(async () => {
        fireEvent.click(screen.getByLabelText("Stage actions"));
      });
      menu = within(openActionsMenu()!);
      expect(menu.queryByText("Remove ROS")).toBeNull();
      expect(menu.getByText("Remove Select")).toBeTruthy();
    });

    it("shows a single Extensions documentation link, not one per extension", () => {
      const value = JSON.stringify({
        "#ext": {
          ros: { extract: {} },
          select: { sql: "SELECT * FROM ENTRY()" },
        },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      const links = screen.getAllByText("View Extensions Documentation →");
      expect(links).toHaveLength(1);
      expect(links[0].closest("a")).toHaveAttribute(
        "href",
        "https://www.reduct.store/docs/extensions",
      );
    });

    it("links ReductStore Pro to the pricing page in the license note when there's no license", async () => {
      const value = JSON.stringify({
        "#ext": { ros: { extract: {} } },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={noLicenseValidationContext}
        />,
      );
      const link = await screen.findByText("ReductStore Pro");
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "https://www.reduct.store/pricing",
      );
    });

    it("hides the license note once a valid Pro license is confirmed via getInfo", async () => {
      const value = JSON.stringify({
        "#ext": { ros: { extract: {} } },
      });
      render(
        <QueryConditionBuilder
          value={value}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={proLicenseValidationContext}
        />,
      );
      await waitFor(() => {
        expect(screen.queryByText("ReductStore Pro")).toBeNull();
      });
    });

    it("always renders ROS above Select", async () => {
      render(
        <QueryConditionBuilder
          value=""
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addTransformBlock();
      await addExtension("ROS");
      await addExtension("Select");
      const rosHeading = screen.getByText("ROS");
      const selectHeading = screen.getByText("Select");
      expect(
        rosHeading.compareDocumentPosition(selectHeading) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe("onChange state and initialState", () => {
    it("calls onChange with the raw builder state alongside the serialized string", async () => {
      const onChange = vi.fn();
      render(
        <QueryConditionBuilder
          value=""
          onChange={onChange}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      await addStageOfKind("$limit");

      const [, lastState] = onChange.mock.calls.at(-1) as [
        string,
        BuilderState,
      ];
      expect(lastState.steps).toHaveLength(1);
      expect(lastState.steps[0].type).toBe("limit");
    });

    it("seeds the builder from initialState instead of parsing value, restoring a disabled stage", () => {
      const initialState: BuilderState = {
        conditionBlocks: [],
        steps: [{ id: "limit-1", type: "limit", limit: { count: 5 } }],
        extBlocks: [],
        blockOrder: ["limit-1"],
        enabled: { "limit-1": false },
        pendingStages: [],
      };
      render(
        <QueryConditionBuilder
          value=""
          initialState={initialState}
          onChange={noop}
          mode="builder"
          onUnrepresentable={noop}
          validationContext={readyValidationContext}
        />,
      );
      expect(screen.getByLabelText("Enable stage")).toBeTruthy();
    });
  });
});
