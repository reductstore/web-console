import React, { useMemo, useState } from "react";
import { Popover, Tree } from "antd";
import {
  DatabaseOutlined,
  LineChartOutlined,
  PartitionOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { encodeEntryPath } from "./EntryBreadcrumb";

export interface NavNode {
  title: React.ReactNode;
  key: string;
  isLeaf: boolean;
  selectable: boolean;
  children?: NavNode[];
}

const naturalCmp = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const buildNavTree = (names: string[], prefix: string): NavNode[] => {
  const childMap = new Map<string, string[]>();
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    if (!rest) continue;
    const slashIdx = rest.indexOf("/");
    const segment = slashIdx === -1 ? rest : rest.slice(0, slashIdx);
    if (!segment) continue;
    if (!childMap.has(segment)) childMap.set(segment, []);
    childMap.get(segment)?.push(name);
  }

  const nodes: NavNode[] = [];
  for (const [segment, entryNames] of childMap.entries()) {
    const fullPath = prefix + segment;
    const isEntry = names.includes(fullPath);
    const hasChildren = entryNames.some((n) => n !== fullPath);
    const children = hasChildren
      ? buildNavTree(names, fullPath + "/")
      : undefined;

    nodes.push({
      title: (
        <span>
          {hasChildren ? (
            <DatabaseOutlined style={{ marginRight: 6, color: "#8c8c8c" }} />
          ) : (
            <LineChartOutlined style={{ marginRight: 6, color: "#8c8c8c" }} />
          )}
          {segment}
        </span>
      ),
      key: fullPath,
      isLeaf: !hasChildren,
      selectable: isEntry,
      children,
    });
  }

  return nodes.sort((a, b) => naturalCmp(String(a.key), String(b.key)));
};

export const getImmediateChildKeys = (
  names: string[],
  current: string,
): string[] => {
  const prefix = current.endsWith("/") ? current : current + "/";
  const childSet = new Set<string>();
  for (const n of names) {
    if (!n.startsWith(prefix)) continue;
    const rest = n.slice(prefix.length);
    if (!rest) continue;
    const [firstSeg] = rest.split("/");
    if (!firstSeg) continue;
    childSet.add(prefix + firstSeg);
  }
  return Array.from(childSet).sort(naturalCmp);
};

interface Props {
  currentPath: string;
  allEntryNames: string[];
  bucketName: string;
}

export default function EntryNavTree(props: Readonly<Props>) {
  const { currentPath, allEntryNames, bucketName } = props;
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const navigateToEntry = (entryName: string) => {
    setPopoverOpen(false);
    navigate(`/buckets/${bucketName}/entries/${encodeEntryPath(entryName)}`);
  };

  const nextChildKeys = useMemo(
    () => getImmediateChildKeys(allEntryNames, currentPath),
    [allEntryNames, currentPath],
  );

  const nextChildrenTree = useMemo(() => {
    if (nextChildKeys.length < 1) return [] as NavNode[];
    const prefix = currentPath.endsWith("/") ? currentPath : currentPath + "/";
    return buildNavTree(allEntryNames, prefix);
  }, [allEntryNames, currentPath, nextChildKeys.length]);

  if (nextChildKeys.length === 0) {
    return null;
  }

  return (
    <Popover
      trigger="click"
      open={popoverOpen}
      onOpenChange={setPopoverOpen}
      content={
        <Tree
          treeData={nextChildrenTree}
          defaultExpandAll
          onSelect={(keys) => {
            if (keys.length > 0) {
              navigateToEntry(keys[0] as string);
            }
          }}
          style={{
            maxHeight: 320,
            overflow: "auto",
            paddingRight: 35,
          }}
        />
      }
    >
      <PartitionOutlined
        className="entryCardNextChildIcon"
        style={{ cursor: "pointer", fontSize: 14, color: "#8c8c8c" }}
      />
    </Popover>
  );
}
