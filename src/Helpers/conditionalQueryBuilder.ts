import { safeParseJSON5 } from "./json5Utils";

export type LabelOperator =
  | "$eq"
  | "$ne"
  | "$gt"
  | "$gte"
  | "$lt"
  | "$lte"
  | "$contains"
  | "$starts_with"
  | "$ends_with"
  | "$in"
  | "$nin";

export type LogicalConnector = "$and" | "$or";

export interface EachNStep {
  everyNth?: number;
}

export interface EachTStep {
  duration: string;
  useIntervalMacro: boolean;
}

export interface LimitStep {
  count?: number;
}

export interface EachNStepEntry {
  id: string;
  type: "each_n";
  eachN: EachNStep;
}

export interface EachTStepEntry {
  id: string;
  type: "each_t";
  eachT: EachTStep;
}

export interface LimitStepEntry {
  id: string;
  type: "limit";
  limit: LimitStep;
}

// $each_n and $each_t are independent directives - a query can combine
// both (e.g. thin to every 20th record, then also throttle to at most one
// per second) - so each gets its own step, exactly like $limit, added and
// removed independently from the "+ Add step" menu (as "Sample by time" /
// "Sample every N").
export type Step = EachNStepEntry | EachTStepEntry | LimitStepEntry;

export type SampleKind = "each_n" | "each_t";

// Fixed id for the "Label filter" block in a QueryConditionBuilder's
// blockOrder - shared so QueryConditionBuilder.tsx and QueryBlockList.tsx
// can't drift apart on what it's called.
export const CONDITIONS_BLOCK_ID = "conditions";

/**
 * Return a new array with the item at fromIndex moved to toIndex.
 */
export function moveItem<T>(
  list: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export interface FlatCondition {
  id: string;
  label: string;
  operator: LabelOperator;
  value: string | string[];
  negated: boolean;
  // Connector to the previous item in the list. Ignored for the first item.
  connector: LogicalConnector;
}

// Values are always typed as text in the builder's UI, but comparisons
// like $gt/$lt against a numeric label silently match nothing if the
// value is sent as a JSON string instead of a JSON number. A value that
// looks like a number is therefore sent as a real number.
function coerceValue(value: string): string | number {
  if (value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

function serializeLeaf(condition: FlatCondition): Record<string, unknown> {
  const coercedValue = Array.isArray(condition.value)
    ? condition.value.map(coerceValue)
    : coerceValue(condition.value);
  const inner = { [condition.operator]: coercedValue };
  return { ["&" + condition.label]: inner };
}

function serializeItem(condition: FlatCondition): Record<string, unknown> {
  const leaf = serializeLeaf(condition);
  return condition.negated ? { $not: leaf } : leaf;
}

/**
 * Check whether a condition's value field has actually been filled in
 * (a single string, or at least one non-blank entry for multi-value
 * operators like $in/$nin).
 */
export function hasValue(value: string | string[]): boolean {
  return Array.isArray(value)
    ? value.some((item) => item.trim() !== "")
    : value.trim() !== "";
}

/**
 * Convert a flat list of conditions into its Conditional Query JSON shape.
 * Items are folded left to right: `[A, B(or), C(and)]` becomes
 * `{"$and": [{"$or": [A, B]}, C]}`, matching the order the user built them in.
 */
export function serializeBuilderList(
  list: FlatCondition[],
): Record<string, unknown> {
  // A row without a label or value isn't a real condition yet - only ever a
  // leftover blank placeholder or one the user hasn't finished typing into -
  // and shouldn't show up in the serialized query.
  const complete = list.filter(
    (item) => item.label.trim() !== "" && hasValue(item.value),
  );
  if (complete.length === 0) {
    return {};
  }
  let acc = serializeItem(complete[0]);
  for (let index = 1; index < complete.length; index++) {
    const item = complete[index];
    acc = { [item.connector]: [acc, serializeItem(item)] };
  }
  return acc;
}

export interface LabelOperatorInfo {
  value: LabelOperator;
  label: string;
  multiValue?: boolean;
}

// Single source of truth for the supported label operators - both their
// validity (isLabelOperator) and their builder-UI presentation (label,
// multiValue) are derived from this list instead of being kept in sync by
// hand across files.
export const LABEL_OPERATORS: LabelOperatorInfo[] = [
  { value: "$eq", label: "=" },
  { value: "$ne", label: "≠" },
  { value: "$gt", label: ">" },
  { value: "$gte", label: "≥" },
  { value: "$lt", label: "<" },
  { value: "$lte", label: "≤" },
  { value: "$contains", label: "contains" },
  { value: "$starts_with", label: "starts with" },
  { value: "$ends_with", label: "ends with" },
  { value: "$in", label: "in", multiValue: true },
  { value: "$nin", label: "not in", multiValue: true },
];

/**
 * Check whether a string is a valid label comparison operator
 */
export function isLabelOperator(value: string): value is LabelOperator {
  return LABEL_OPERATORS.some((operator) => operator.value === value);
}

/**
 * Check whether an operator takes a list of values ($in/$nin) rather than
 * a single scalar.
 */
export function isMultiValueOperator(operator: LabelOperator): boolean {
  return LABEL_OPERATORS.some(
    (info) => info.value === operator && info.multiValue === true,
  );
}

export function serializeSteps(steps: Step[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  const eachNEntry = steps.find(
    (step): step is EachNStepEntry => step.type === "each_n",
  );
  if (eachNEntry) {
    result.$each_n = eachNEntry.eachN.everyNth ?? null;
  }

  const eachTEntry = steps.find(
    (step): step is EachTStepEntry => step.type === "each_t",
  );
  if (eachTEntry) {
    result.$each_t = eachTEntry.eachT.useIntervalMacro
      ? "$__interval"
      : eachTEntry.eachT.duration;
  }

  const limitEntry = steps.find(
    (step): step is LimitStepEntry => step.type === "limit",
  );
  if (limitEntry) {
    result.$limit = limitEntry.limit.count ?? null;
  }

  return result;
}

// Every shape this parser recognizes - a label leaf, a $not wrapper, a
// $and/$or chain - is a plain object with exactly one key. Centralizing that
// check here avoids repeating the same object/array/key-count guard in each
// of the functions below.
function singleKeyEntry(json: unknown): [string, unknown] | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }
  const keys = Object.keys(json);
  if (keys.length !== 1) {
    return null;
  }
  const [key] = keys;
  return [key, (json as Record<string, unknown>)[key]];
}

interface ParsedLeaf {
  label: string;
  operator: LabelOperator;
  value: string | string[];
}

function parseLeaf(json: unknown): ParsedLeaf | null {
  const labelEntry = singleKeyEntry(json);
  if (!labelEntry) {
    return null;
  }
  const [labelKey, innerValue] = labelEntry;
  if (!labelKey.startsWith("&")) {
    return null;
  }
  const label = labelKey.slice(1);

  const operatorEntry = singleKeyEntry(innerValue);
  if (!operatorEntry) {
    return null;
  }
  const [operatorKey, value] = operatorEntry;
  if (!isLabelOperator(operatorKey)) {
    return null;
  }

  const isValidItem = (item: unknown) =>
    typeof item === "string" || typeof item === "number";
  const isValid = isMultiValueOperator(operatorKey)
    ? Array.isArray(value) && value.every(isValidItem)
    : isValidItem(value);
  // Booleans, other JSON types, and a shape that doesn't match the
  // operator's arity (an array for $eq, a scalar for $in) are intentionally
  // rejected: the builder can't represent them, so falling back to JSON
  // mode is safer than producing a row the UI can't render correctly.
  if (!isValid) {
    return null;
  }

  // The value is always stored as text internally (the value field is a
  // plain text input); serializeBuilderList converts it back to a JSON
  // number automatically when it looks like one.
  const normalizedValue = Array.isArray(value)
    ? value.map((item) => String(item))
    : String(value);

  return { label, operator: operatorKey, value: normalizedValue };
}

interface ParsedItem {
  leaf: ParsedLeaf;
  negated: boolean;
}

// A single row of the builder: either a bare condition, or one wrapped in
// $not (the only shape the "NOT" toggle can produce). Anything else - in
// particular $not wrapping more than one condition - isn't representable.
function parseSingleItem(json: unknown): ParsedItem | null {
  const notEntry = singleKeyEntry(json);
  if (notEntry && notEntry[0] === "$not") {
    const leaf = parseLeaf(notEntry[1]);
    return leaf ? { leaf, negated: true } : null;
  }
  const leaf = parseLeaf(json);
  return leaf ? { leaf, negated: false } : null;
}

function toFlatCondition(
  item: ParsedItem,
  connector: LogicalConnector,
): FlatCondition {
  return {
    id: crypto.randomUUID(),
    label: item.leaf.label,
    operator: item.leaf.operator,
    value: item.leaf.value,
    negated: item.negated,
    connector,
  };
}

function isLogicalConnector(value: string): value is LogicalConnector {
  return value === "$and" || value === "$or";
}

// Recognizes exactly the shapes this file's own serializer can produce for
// a chain of 1+ items, plus the natural flat array form (`{"$and":[a,b,c]}`,
// all one operator) that a hand-typed query is likely to use instead. Any
// deeper/mixed nesting - real grouping - isn't representable and falls back
// to JSON mode by design.
function parseChain(json: unknown): FlatCondition[] | null {
  const single = parseSingleItem(json);
  if (single) {
    return [toFlatCondition(single, "$and")];
  }

  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }
  const keys = Object.keys(json);
  if (keys.length !== 1) {
    return null;
  }
  const [operatorKey] = keys;
  if (!isLogicalConnector(operatorKey)) {
    return null;
  }
  const rawValue = (json as Record<string, unknown>)[operatorKey];
  if (!Array.isArray(rawValue) || rawValue.length < 2) {
    return null;
  }

  const simpleItems = rawValue.map((item) => parseSingleItem(item));
  if (simpleItems.every((item): item is ParsedItem => item !== null)) {
    return simpleItems.map((item) => toFlatCondition(item, operatorKey));
  }

  // Otherwise this can only be the strict left-associative binary pair
  // `[left, right]` this file's serializer produces for mixed connectors.
  if (rawValue.length !== 2) {
    return null;
  }
  const [left, right] = rawValue;
  const rightItem = parseSingleItem(right);
  if (!rightItem) {
    return null;
  }
  const leftChain = parseChain(left);
  if (!leftChain) {
    return null;
  }
  return [...leftChain, toFlatCondition(rightItem, operatorKey)];
}

function parseSteps(
  eachN: unknown,
  eachT: unknown,
  limit: unknown,
): { success: boolean; steps?: Step[] } {
  const steps: Step[] = [];

  if (eachN !== undefined) {
    // null is what serializeSteps emits for an $each_n step added but not
    // yet filled in - accepted here as "no count typed yet" so a query
    // saved mid-edit still round-trips into Builder mode instead of being
    // rejected as unrepresentable.
    if (eachN !== null && typeof eachN !== "number") {
      return { success: false };
    }
    steps.push({
      id: crypto.randomUUID(),
      type: "each_n",
      eachN: { everyNth: eachN === null ? undefined : eachN },
    });
  }

  if (eachT !== undefined) {
    if (typeof eachT !== "string") {
      return { success: false };
    }
    steps.push({
      id: crypto.randomUUID(),
      type: "each_t",
      eachT:
        eachT === "$__interval"
          ? { duration: "", useIntervalMacro: true }
          : { duration: eachT, useIntervalMacro: false },
    });
  }

  if (limit !== undefined) {
    // Same reasoning as $each_n above: null is a blank Limit step, not a
    // malformed one.
    if (limit !== null && typeof limit !== "number") {
      return { success: false };
    }
    steps.push({
      id: crypto.randomUUID(),
      type: "limit",
      limit: { count: limit === null ? undefined : limit },
    });
  }

  return { success: true, steps: steps.length > 0 ? steps : undefined };
}

export interface ParseBuilderListResult {
  success: boolean;
  list?: FlatCondition[];
  // Present when the input carried $each_n/$each_t/$limit directives
  // alongside (or instead of) conditions.
  steps?: Step[];
  error?: string;
}

/**
 * Parse Conditional Query JSON into a flat list of conditions, if representable
 */
export function parseBuilderList(json: unknown): ParseBuilderListResult {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    const list = parseChain(json);
    if (!list) {
      return { success: false, error: "Failed to parse condition" };
    }
    return { success: true, list };
  }

  // $each_n/$each_t/$limit are sampling/limit directives that sit alongside
  // the conditions, not one of them - strip them out before matching the
  // remaining shape so a query combining them with real conditions doesn't
  // get rejected just because of it.
  const {
    $each_n: eachN,
    $each_t: eachT,
    $limit: limit,
    ...rest
  } = json as Record<string, unknown>;

  const parsedSteps = parseSteps(eachN, eachT, limit);
  if (!parsedSteps.success) {
    return { success: false, error: "Failed to parse condition" };
  }
  const { steps } = parsedSteps;

  if (Object.keys(rest).length === 0) {
    return { success: true, list: [], steps };
  }

  const list = parseChain(rest);
  if (!list) {
    return { success: false, error: "Failed to parse condition" };
  }
  return { success: true, list, steps };
}

export interface ParsedQueryValue {
  list: FlatCondition[];
  steps?: Step[];
}

/**
 * Parse Conditional Query JSON5 text, if representable as a flat list of
 * conditions - the shared check behind both the builder's own resync and
 * whether a JSON query can be shown in Builder mode at all.
 */
export function parseQueryValue(text: string): ParsedQueryValue | undefined {
  const parsed = safeParseJSON5(text);
  if (!parsed.success) {
    return undefined;
  }
  const result = parseBuilderList(parsed.value);
  return result.success
    ? { list: result.list ?? [], steps: result.steps }
    : undefined;
}

/**
 * Return a new list with the given condition's fields updated
 */
export function updateCondition(
  list: FlatCondition[],
  id: string,
  changes: Partial<
    Pick<
      FlatCondition,
      "label" | "operator" | "value" | "negated" | "connector"
    >
  >,
): FlatCondition[] {
  return list.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

/**
 * Return a new list with the given condition removed
 */
export function removeCondition(
  list: FlatCondition[],
  id: string,
): FlatCondition[] {
  return list.filter((item) => item.id !== id);
}

/**
 * Return a new list with an empty condition appended
 */
export function addCondition(list: FlatCondition[]): FlatCondition[] {
  return [
    ...list,
    {
      id: crypto.randomUUID(),
      label: "",
      operator: "$eq",
      value: "",
      negated: false,
      connector: "$and",
    },
  ];
}

export function addEachNStep(steps: Step[]): Step[] {
  return [
    ...steps,
    { id: crypto.randomUUID(), type: "each_n", eachN: { everyNth: 2 } },
  ];
}

export function addEachTStep(steps: Step[]): Step[] {
  return [
    ...steps,
    {
      id: crypto.randomUUID(),
      type: "each_t",
      eachT: { duration: "", useIntervalMacro: true },
    },
  ];
}

export function addLimitStep(steps: Step[]): Step[] {
  return [
    ...steps,
    { id: crypto.randomUUID(), type: "limit", limit: { count: 1000 } },
  ];
}

export function updateEachNStep(
  steps: Step[],
  id: string,
  changes: Partial<EachNStep>,
): Step[] {
  return steps.map((step) =>
    step.id === id && step.type === "each_n"
      ? { ...step, eachN: { ...step.eachN, ...changes } }
      : step,
  );
}

export function updateEachTStep(
  steps: Step[],
  id: string,
  changes: Partial<EachTStep>,
): Step[] {
  return steps.map((step) =>
    step.id === id && step.type === "each_t"
      ? { ...step, eachT: { ...step.eachT, ...changes } }
      : step,
  );
}

export function updateLimitStep(
  steps: Step[],
  id: string,
  changes: Partial<LimitStep>,
): Step[] {
  return steps.map((step) =>
    step.id === id && step.type === "limit"
      ? { ...step, limit: { ...step.limit, ...changes } }
      : step,
  );
}

export function removeStep(steps: Step[], id: string): Step[] {
  return steps.filter((step) => step.id !== id);
}

export function hasIncompleteSteps(steps: Step[]): boolean {
  const eachNEntry = steps.find(
    (step): step is EachNStepEntry => step.type === "each_n",
  );
  const eachNIncomplete =
    !!eachNEntry && eachNEntry.eachN.everyNth === undefined;

  const eachTEntry = steps.find(
    (step): step is EachTStepEntry => step.type === "each_t",
  );
  const eachTIncomplete =
    !!eachTEntry &&
    !eachTEntry.eachT.useIntervalMacro &&
    eachTEntry.eachT.duration.trim() === "";

  const limitEntry = steps.find(
    (step): step is LimitStepEntry => step.type === "limit",
  );
  const limitIncomplete = !!limitEntry && limitEntry.limit.count === undefined;

  return eachNIncomplete || eachTIncomplete || limitIncomplete;
}
