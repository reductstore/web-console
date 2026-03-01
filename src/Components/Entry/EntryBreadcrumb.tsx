import React, { useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { Popover, Tree } from "antd";
import { EllipsisOutlined } from "@ant-design/icons";
import { buildNavTree } from "./EntryNavTree";

interface Props {
  bucketName: string;
  entryName: string;
  allEntryNames?: string[];
}

const encodeEntryPath = (entry: string) =>
  entry
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const MAX_VISIBLE_SEGMENTS = 4;

export default function EntryBreadcrumb(props: Readonly<Props>) {
  const { bucketName, entryName, allEntryNames = [] } = props;
  const history = useHistory();
  const segments = entryName.split("/");
  const [ellipsisPopoverOpen, setEllipsisPopoverOpen] = useState(false);

  const navigateToPath = (path: string) => {
    history.push(`/buckets/${bucketName}/entries/${encodeEntryPath(path)}`);
  };

  const handleBucketClick = () => {
    history.push(`/buckets/${bucketName}`);
  };

  const needsTruncation = segments.length > MAX_VISIBLE_SEGMENTS;

  const ellipsisTreeData = useMemo(() => {
    if (!needsTruncation) return [];
    const prefix = segments[0] + "/";
    return buildNavTree(allEntryNames, prefix);
  }, [needsTruncation, segments, allEntryNames]);

  const breadcrumbElements = useMemo(() => {
    if (!needsTruncation) {
      return segments.map((segment, i) => {
        const isLast = i === segments.length - 1;
        return (
          <React.Fragment key={i}>
            {isLast ? (
              <span>{segment}</span>
            ) : (
              <a
                onClick={() => {
                  const targetPrefix = segments.slice(0, i + 1).join("/");
                  navigateToPath(targetPrefix);
                }}
              >
                {segment}
              </a>
            )}
            {!isLast && " / "}
          </React.Fragment>
        );
      });
    }

    const [firstSegment] = segments;
    const lastSegments = segments.slice(-2);
    const lastStartIndex = segments.length - 2;

    return (
      <>
        <a
          onClick={() => {
            navigateToPath(firstSegment);
          }}
        >
          {firstSegment}
        </a>
        {" / "}
        <Popover
          trigger="click"
          open={ellipsisPopoverOpen}
          onOpenChange={setEllipsisPopoverOpen}
          content={
            <Tree
              treeData={ellipsisTreeData}
              defaultExpandAll
              onSelect={(keys) => {
                if (keys.length > 0) {
                  setEllipsisPopoverOpen(false);
                  navigateToPath(keys[0] as string);
                }
              }}
              style={{
                maxHeight: 320,
                overflow: "auto",
                minWidth: 240,
              }}
            />
          }
        >
          <EllipsisOutlined
            style={{
              cursor: "pointer",
              padding: "0 4px",
              fontSize: "14px",
            }}
          />
        </Popover>
        {" / "}
        {lastSegments.map((segment, i) => {
          const actualIndex = lastStartIndex + i;
          const isLast = actualIndex === segments.length - 1;
          return (
            <React.Fragment key={actualIndex}>
              {isLast ? (
                <span>{segment}</span>
              ) : (
                <a
                  onClick={() => {
                    const targetPrefix = segments
                      .slice(0, actualIndex + 1)
                      .join("/");
                    navigateToPath(targetPrefix);
                  }}
                >
                  {segment}
                </a>
              )}
              {!isLast && " / "}
            </React.Fragment>
          );
        })}
      </>
    );
  }, [
    segments,
    needsTruncation,
    ellipsisTreeData,
    ellipsisPopoverOpen,
    navigateToPath,
  ]);

  return (
    <>
      <a onClick={handleBucketClick}>{bucketName}</a>
      {" / "}
      {breadcrumbElements}
    </>
  );
}

export { encodeEntryPath };
