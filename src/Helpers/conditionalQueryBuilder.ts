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
  const isValidArray = Array.isArray(value) && value.every(isValidItem);
  // Booleans and other JSON types are intentionally rejected: the builder
  // only edits text/number values today, so anything else is treated as
  // "not representable in the builder" rather than silently dropped.
  if (!isValidItem(value) && !isValidArray) {
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

export interface ParseBuilderListResult {
  success: boolean;
  list?: FlatCondition[];
  // Present when the input carried a top-level $each_t directive alongside
  // (or instead of) conditions. $each_t is a sampling directive outside the
  // builder's scope (see #232) - its value is surfaced here rather than
  // dropped, so a caller can carry it through instead of silently losing it
  // the next time it re-serializes the conditions.
  eachT?: unknown;
  error?: string;
}

/**
 * Parse Conditional Query JSON into a flat list of conditions, if representable
 */
export function parseBuilderList(json: unknown): ParseBuilderListResult {
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {
    const keys = Object.keys(json);
    if (keys.length === 0) {
      return { success: true, list: [] };
    }
    // Treat "only $each_t" like an empty list of conditions so the default
    // query, which always includes it, stays representable in Builder mode.
    if (keys.length === 1 && keys[0] === "$each_t") {
      return {
        success: true,
        list: [],
        eachT: (json as Record<string, unknown>)["$each_t"],
      };
    }
  }

  const list = parseChain(json);
  if (!list) {
    return { success: false, error: "Failed to parse condition" };
  }
  return { success: true, list };
}

export interface ParsedQueryValue {
  list: FlatCondition[];
  eachT?: unknown;
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
    ? { list: result.list ?? [], eachT: result.eachT }
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
