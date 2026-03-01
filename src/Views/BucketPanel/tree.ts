import { EntryInfo } from "reduct-js";

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

interface TreeStats {
  records: bigint;
  blocks: bigint;
  size: bigint;
  oldest?: bigint;
  latest?: bigint;
}

export interface EntryTreeNode {
  key: string;
  segment: string;
  fullName: string;
  children: EntryTreeNode[];
  ownEntry?: EntryInfo;
  stats: TreeStats;
}

type RawNode = {
  segment: string;
  fullPath: string;
  ownEntry?: EntryInfo;
  children: Map<string, RawNode>;
};

function mergeStats(a: TreeStats, b: TreeStats): TreeStats {
  const oldest =
    a.oldest === undefined
      ? b.oldest
      : b.oldest === undefined
        ? a.oldest
        : a.oldest < b.oldest
          ? a.oldest
          : b.oldest;

  const latest =
    a.latest === undefined
      ? b.latest
      : b.latest === undefined
        ? a.latest
        : a.latest > b.latest
          ? a.latest
          : b.latest;

  return {
    records: a.records + b.records,
    blocks: a.blocks + b.blocks,
    size: a.size + b.size,
    oldest,
    latest,
  };
}

export function naturalNameSort(a: string, b: string): number {
  return nameCollator.compare(a, b);
}

export function buildEntryTree(entries: EntryInfo[]): EntryTreeNode[] {
  const roots = new Map<string, RawNode>();

  for (const entry of entries) {
    const parts = entry.name.split("/");
    let currentMap = roots;
    let fullPath = "";

    for (const part of parts) {
      fullPath = fullPath ? `${fullPath}/${part}` : part;
      if (!currentMap.has(part)) {
        currentMap.set(part, {
          segment: part,
          fullPath,
          children: new Map<string, RawNode>(),
        });
      }

      const nextNode = currentMap.get(part);
      if (!nextNode) continue;
      currentMap = nextNode.children;

      if (fullPath === entry.name) {
        nextNode.ownEntry = entry;
      }
    }
  }

  const toNode = (node: RawNode): EntryTreeNode => {
    const children = Array.from(node.children.values())
      .sort((a, b) => naturalNameSort(a.segment, b.segment))
      .map(toNode);

    const ownStats: TreeStats = node.ownEntry
      ? {
          records: node.ownEntry.recordCount ?? 0n,
          blocks: node.ownEntry.blockCount ?? 0n,
          size: node.ownEntry.size ?? 0n,
          oldest:
            (node.ownEntry.recordCount ?? 0n) > 0n
              ? node.ownEntry.oldestRecord
              : undefined,
          latest:
            (node.ownEntry.recordCount ?? 0n) > 0n
              ? node.ownEntry.latestRecord
              : undefined,
        }
      : { records: 0n, blocks: 0n, size: 0n };

    const stats = children.reduce(
      (acc, child) => mergeStats(acc, child.stats),
      ownStats,
    );

    return {
      key: node.fullPath,
      fullName: node.fullPath,
      segment: node.segment,
      ownEntry: node.ownEntry,
      children,
      stats,
    };
  };

  return Array.from(roots.values())
    .sort((a, b) => naturalNameSort(a.segment, b.segment))
    .map(toNode);
}
