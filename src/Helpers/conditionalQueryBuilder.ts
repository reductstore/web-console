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
 * Convert a flat list of conditions into its Conditional Query JSON shape.
 * Items are folded left to right: `[A, B(or), C(and)]` becomes
 * `{"$and": [{"$or": [A, B]}, C]}`, matching the order the user built them in.
 */
export function serializeBuilderList(
  list: FlatCondition[],
): Record<string, unknown> {
  if (list.length === 0) {
    return {};
  }
  let acc = serializeItem(list[0]);
  for (let index = 1; index < list.length; index++) {
    const item = list[index];
    acc = { [item.connector]: [acc, serializeItem(item)] };
  }
  return acc;
}

const LABEL_OPERATORS: LabelOperator[] = [
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

/**
 * Check whether a string is a valid label comparison operator
 */
export function isLabelOperator(value: string): value is LabelOperator {
  return LABEL_OPERATORS.includes(value as LabelOperator);
}

interface ParsedLeaf {
  label: string;
  operator: LabelOperator;
  value: string | string[];
}

function parseLeaf(json: unknown): ParsedLeaf | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }

  const keys = Object.keys(json);
  if (keys.length !== 1) {
    return null;
  }

  const [labelKey] = keys;
  if (!labelKey.startsWith("&")) {
    return null;
  }

  const label = labelKey.slice(1);

  const innerValue = (json as Record<string, unknown>)[labelKey];
  if (
    typeof innerValue !== "object" ||
    innerValue === null ||
    Array.isArray(innerValue)
  ) {
    return null;
  }
  const operatorKeys = Object.keys(innerValue);
  if (operatorKeys.length !== 1) {
    return null;
  }

  const [operatorKey] = operatorKeys;
  if (!isLabelOperator(operatorKey)) {
    return null;
  }

  const value = (innerValue as Record<string, unknown>)[operatorKey];
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
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {
    const keys = Object.keys(json);
    if (keys.length === 1 && keys[0] === "$not") {
      const leaf = parseLeaf((json as Record<string, unknown>)["$not"]);
      return leaf ? { leaf, negated: true } : null;
    }
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
    // $each_t is a sampling directive outside the builder's scope (see #232);
    // treat "only $each_t" like an empty list so the default query, which
    // always includes it, stays representable in Builder mode.
    if (keys.length === 1 && keys[0] === "$each_t") {
      return { success: true, list: [] };
    }
  }

  const list = parseChain(json);
  if (!list) {
    return { success: false, error: "Failed to parse condition" };
  }
  return { success: true, list };
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
