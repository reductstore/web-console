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

export type LogicalOperator = "$and" | "$or" | "$not";

export interface LabelCondition {
  kind: "condition";
  id: string;
  label: string;
  operator: LabelOperator;
  value: string | string[];
}

export type ConditionNode = LabelCondition | ConditionGroup;

export interface ConditionGroup {
  kind: "group";
  id: string;
  operator: LogicalOperator;
  children: ConditionNode[];
}

export type BuilderTree = ConditionGroup | null;

function serializeCondition(
  condition: LabelCondition,
): Record<string, unknown> {
  const inner = { [condition.operator]: condition.value };
  const outer = { ["&" + condition.label]: inner };
  return outer;
}

function serializeNode(node: ConditionNode): Record<string, unknown> {
  if (node.kind === "condition") {
    return serializeCondition(node);
  }
  return serializeGroup(node);
}

function serializeGroup(group: ConditionGroup): Record<string, unknown> {
  if (group.children.length === 0) {
    return {};
  }
  if (group.operator === "$and" || group.operator === "$or") {
    const serializedChildren = group.children.map((child) =>
      serializeNode(child),
    );
    return { [group.operator]: serializedChildren };
  }
  if (group.operator === "$not") {
    if (group.children.length === 1) {
      const serializedChild = serializeNode(group.children[0]);
      return { [group.operator]: serializedChild };
    }
    const serializedChildren = group.children.map((child) =>
      serializeNode(child),
    );
    const andWrapper = { $and: serializedChildren };
    return { [group.operator]: andWrapper };
  }
  return {};
}

export function serializeBuilderTree(
  tree: BuilderTree,
): Record<string, unknown> {
  if (!tree) {
    return {};
  }
  if (tree.operator === "$and" && tree.children.length === 1) {
    return serializeNode(tree.children[0]);
  }
  return serializeGroup(tree);
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

export function isLabelOperator(value: string): value is LabelOperator {
  return LABEL_OPERATORS.includes(value as LabelOperator);
}

function parseLabelCondition(json: unknown): LabelCondition | null {
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
  const isStringArray =
    Array.isArray(value) && value.every((item) => typeof item === "string");
  if (typeof value !== "string" && !isStringArray) {
    return null;
  }

  return {
    kind: "condition",
    id: crypto.randomUUID(),
    label,
    operator: operatorKey,
    value: value as string | string[],
  };
}

function parseConditionNode(json: unknown): ConditionNode | null {
  const condition = parseLabelCondition(json);
  if (condition) {
    return condition;
  }
  return parseConditionGroup(json);
}

function parseConditionGroup(json: unknown): ConditionGroup | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }

  const keys = Object.keys(json);
  if (keys.length !== 1) {
    return null;
  }

  const [operatorKey] = keys;
  if (!isLogicalOperator(operatorKey)) {
    return null;
  }

  const rawValue = (json as Record<string, unknown>)[operatorKey];
  if (operatorKey === "$and" || operatorKey === "$or") {
    if (!Array.isArray(rawValue)) {
      return null;
    }
    const parsedChildren = rawValue.map((item) => parseConditionNode(item));
    if (parsedChildren.some((child) => child === null)) {
      return null;
    }
    return {
      kind: "group",
      id: crypto.randomUUID(),
      operator: operatorKey,
      children: parsedChildren as ConditionNode[],
    };
  }

  const child = parseConditionNode(rawValue);
  if (!child) {
    return null;
  }
  return {
    kind: "group",
    id: crypto.randomUUID(),
    operator: operatorKey,
    children: [child],
  };
}

const LOGICAL_OPERATORS: LogicalOperator[] = ["$and", "$or", "$not"];

export function isLogicalOperator(value: string): value is LogicalOperator {
  return LOGICAL_OPERATORS.includes(value as LogicalOperator);
}

export interface ParseBuilderTreeResult {
  success: boolean;
  tree?: BuilderTree;
  error?: string;
}

export function parseBuilderTree(json: unknown): ParseBuilderTreeResult {
  if (
    typeof json === "object" &&
    json !== null &&
    !Array.isArray(json) &&
    Object.keys(json).length === 0
  ) {
    return { success: true, tree: null };
  }

  const node = parseConditionNode(json);
  if (!node) {
    return { success: false, error: "Failed to parse condition node" };
  }

  if (node.kind === "group") {
    return { success: true, tree: node };
  }

  return {
    success: true,
    tree: {
      kind: "group",
      id: crypto.randomUUID(),
      operator: "$and",
      children: [node],
    },
  };
}

function updateNode(
  node: ConditionNode,
  id: string,
  changes: Partial<Pick<LabelCondition, "label" | "operator" | "value">>,
): ConditionNode {
  if (node.kind === "condition") {
    if (node.id !== id) {
      return node;
    }
    return { ...node, ...changes };
  }
  return {
    ...node,
    children: node.children.map((child) => updateNode(child, id, changes)),
  };
}

export function updateCondition(
  tree: BuilderTree,
  id: string,
  changes: Partial<Pick<LabelCondition, "label" | "operator" | "value">>,
): BuilderTree {
  if (!tree) {
    return null;
  }
  return updateNode(tree, id, changes) as ConditionGroup;
}

function removeFromChildren(
  children: ConditionNode[],
  id: string,
): ConditionNode[] {
  return children
    .filter((child) => child.id !== id)
    .map((child) =>
      child.kind === "group"
        ? { ...child, children: removeFromChildren(child.children, id) }
        : child,
    );
}

export function removeNode(tree: BuilderTree, id: string): BuilderTree {
  if (!tree) {
    return tree;
  }
  if (tree.id === id) {
    return null;
  }
  return { ...tree, children: removeFromChildren(tree.children, id) };
}

function addChildToGroup(
  node: ConditionNode,
  groupId: string,
  child: ConditionNode,
): ConditionNode {
  if (node.kind !== "group") {
    return node;
  }
  if (node.id === groupId) {
    return { ...node, children: [...node.children, child] };
  }
  return {
    ...node,
    children: node.children.map((c) => addChildToGroup(c, groupId, child)),
  };
}

export function addCondition(
  tree: BuilderTree,
  groupId: string | null,
): BuilderTree {
  const newCondition: LabelCondition = {
    kind: "condition",
    id: crypto.randomUUID(),
    label: "",
    operator: "$eq",
    value: "",
  };
  if (!tree) {
    return {
      kind: "group",
      id: crypto.randomUUID(),
      operator: "$and",
      children: [newCondition],
    };
  }
  if (groupId === null || groupId === tree.id) {
    return { ...tree, children: [...tree.children, newCondition] };
  }
  return addChildToGroup(tree, groupId, newCondition) as ConditionGroup;
}

export function addGroup(
  tree: BuilderTree,
  groupId: string | null,
): BuilderTree {
  const newGroup: ConditionGroup = {
    kind: "group",
    id: crypto.randomUUID(),
    operator: "$and",
    children: [],
  };
  if (!tree) {
    return {
      kind: "group",
      id: crypto.randomUUID(),
      operator: "$and",
      children: [newGroup],
    };
  }
  if (groupId === null || groupId === tree.id) {
    return { ...tree, children: [...tree.children, newGroup] };
  }
  return addChildToGroup(tree, groupId, newGroup) as ConditionGroup;
}

function updateGroupOperatorNode(
  node: ConditionNode,
  groupId: string,
  operator: LogicalOperator,
): ConditionNode {
  if (node.kind !== "group") {
    return node;
  }
  if (node.id === groupId) {
    return { ...node, operator };
  }
  return {
    ...node,
    children: node.children.map((child) =>
      updateGroupOperatorNode(child, groupId, operator),
    ),
  };
}

export function updateGroupOperator(
  tree: BuilderTree,
  groupId: string,
  operator: LogicalOperator,
): BuilderTree {
  if (!tree) {
    return tree;
  }
  return updateGroupOperatorNode(tree, groupId, operator) as ConditionGroup;
}
