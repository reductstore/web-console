import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Col,
  message,
  Popover,
  Row,
  Segmented,
  Statistic,
  Tag,
  Tooltip,
  Tree,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  LoadingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  APIError,
  EntryInfo,
  Status,
  TokenPermissions,
  Client,
} from "reduct-js";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../Bucket/BucketCard";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import ActionIcon from "../ActionIcon";
import EntryBreadcrumb, { encodeEntryPath } from "./EntryBreadcrumb";
import { getImmediateChildKeys, buildNavTree } from "./EntryNavTree";
import EntryNavTree from "./EntryNavTree";
import "./EntryCard.css";

interface Props {
  entryInfo: EntryInfo;
  bucketName: string;
  permissions?: TokenPermissions;
  showUnix?: boolean;
  client: Client;
  onBack?: () => void;
  onRemoved?: (entryName: string) => void;
  onAddRecord?: () => void;
  hasWritePermission?: boolean;
  allEntryNames?: string[];
  allEntries?: EntryInfo[];
  loading?: boolean;
}

export default function EntryCard(props: Readonly<Props>) {
  const { entryInfo, bucketName, permissions, onRemoved, showUnix } = props;
  const [entryToRemove, setEntryToRemove] = useState<string>("");
  const [entryStatus, setEntryStatus] = useState(entryInfo.status);
  const deletionTooltip = "Deletion in progress. Action disabled.";
  const isDeleting = entryStatus === Status.DELETING;
  const isCardLoading = Boolean(props.loading);
  const [showAggregated, setShowAggregated] = useState(false);

  useEffect(() => {
    setEntryStatus(entryInfo.status);
  }, [entryInfo.status]);

  const printTimestamp = (timestamp: bigint, records: bigint) => {
    if (records === 0n) return "---";
    if (showUnix) return Number(timestamp);
    return new Date(Number(timestamp / 1_000n))
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
  };

  const removeEntry = async (name: string) => {
    const { client, bucketName } = props;
    const previousStatus = entryInfo.status ?? Status.READY;
    setEntryToRemove("");
    setEntryStatus(Status.DELETING);
    try {
      const bucket = await client.getBucket(bucketName);
      await bucket.removeEntry(name);
      onRemoved?.(name);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err instanceof APIError && err.message
          ? err.message
          : "Failed to remove entry.";
      message.error(errorMsg);
      setEntryStatus(previousStatus);
    }
  };

  const allNames = props.allEntryNames ?? [];

  const displayedEntryInfo = useMemo(() => {
    if (!showAggregated || !props.allEntries?.length) return entryInfo;

    const prefix = `${entryInfo.name}/`;
    const related = props.allEntries.filter(
      (e) => e.name === entryInfo.name || e.name.startsWith(prefix),
    );
    if (!related.length) return entryInfo;

    let size = 0n;
    let recordCount = 0n;
    let blockCount = 0n;
    let oldest: bigint | undefined;
    let latest: bigint | undefined;

    for (const e of related) {
      const eRecords = e.recordCount ?? 0n;
      const eBlocks = e.blockCount ?? 0n;
      const eSize = e.size ?? 0n;
      size += eSize;
      recordCount += eRecords;
      blockCount += eBlocks;

      if (eRecords > 0n) {
        if (oldest === undefined || e.oldestRecord < oldest)
          oldest = e.oldestRecord;
        if (latest === undefined || e.latestRecord > latest)
          latest = e.latestRecord;
      }
    }

    return {
      ...entryInfo,
      size,
      recordCount,
      blockCount,
      oldestRecord: oldest ?? 0n,
      latestRecord: latest ?? 0n,
    } as EntryInfo;
  }, [entryInfo, props.allEntries, showAggregated]);

  const navigate = useNavigate();
  const [forwardPopoverOpen, setForwardPopoverOpen] = useState(false);

  const childKeys = useMemo(
    () => getImmediateChildKeys(allNames, entryInfo.name),
    [allNames, entryInfo.name],
  );

  const childTree = useMemo(() => {
    if (childKeys.length <= 1) return [];
    const prefix = entryInfo.name + "/";
    return buildNavTree(allNames, prefix);
  }, [allNames, entryInfo.name, childKeys.length]);

  const navigateToEntry = (name: string) => {
    setForwardPopoverOpen(false);
    navigate(`/buckets/${bucketName}/entries/${encodeEntryPath(name)}`);
  };

  const actions = [];

  if (props.onBack) {
    actions.push(
      <Tooltip title="Back" key="back">
        <ArrowLeftOutlined onClick={props.onBack} />
      </Tooltip>,
    );
  }

  if (childKeys.length === 1) {
    actions.push(
      <Tooltip title="Go to child" key="forward">
        <ArrowRightOutlined onClick={() => navigateToEntry(childKeys[0])} />
      </Tooltip>,
    );
  } else if (childKeys.length > 1) {
    actions.push(
      <Popover
        key="forward"
        trigger="click"
        open={forwardPopoverOpen}
        onOpenChange={setForwardPopoverOpen}
        content={
          <Tree
            treeData={childTree}
            defaultExpandAll
            onSelect={(keys) => {
              if (keys.length > 0) {
                navigateToEntry(keys[0] as string);
              }
            }}
            style={{ maxHeight: 320, overflow: "auto", paddingRight: 35 }}
          />
        }
      >
        <Tooltip title="Go to child">
          <ArrowRightOutlined style={{ cursor: "pointer" }} />
        </Tooltip>
      </Popover>,
    );
  }

  if (
    permissions?.fullAccess ||
    (permissions?.write && permissions.write.indexOf(bucketName) !== -1)
  ) {
    if (props.onAddRecord) {
      actions.push(
        <ActionIcon
          key="add-record"
          icon={<UploadOutlined title="Add record" />}
          disabled={isDeleting}
          tooltip="Add record"
          showTooltipWhenEnabled
          onClick={props.onAddRecord}
        />,
      );
    }
    actions.push(
      <ActionIcon
        key="delete"
        icon={<DeleteOutlined title="Remove entry" style={{ color: "red" }} />}
        disabled={isDeleting}
        tooltip={isDeleting ? deletionTooltip : "Remove entry"}
        showTooltipWhenEnabled
        onClick={() => setEntryToRemove(entryInfo.name)}
      />,
    );
  }

  return (
    <>
      <Card
        className="EntryCard"
        title={
          <div className="entryCardTitle">
            <span className="entryCardTitlePath">
              <EntryBreadcrumb
                bucketName={bucketName}
                entryName={entryInfo.name}
                allEntryNames={allNames}
              />
              <EntryNavTree
                currentPath={entryInfo.name}
                allEntryNames={allNames}
                bucketName={bucketName}
              />
            </span>
            {isDeleting ? (
              <span className="entryCardStatus">
                <Tag color="processing" icon={<LoadingOutlined spin />}>
                  Deleting
                </Tag>
              </span>
            ) : null}
          </div>
        }
        actions={actions}
      >
        <Row gutter={24}>
          <Col span={8}>
            <Statistic
              title="Size"
              value={prettierBytes(Number(displayedEntryInfo.size))}
              loading={isCardLoading}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Records"
              value={displayedEntryInfo.recordCount.toString()}
              loading={isCardLoading}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Blocks"
              value={displayedEntryInfo.blockCount.toString()}
              loading={isCardLoading}
            />
          </Col>
        </Row>
        <Row gutter={24} style={{ marginTop: "1em" }}>
          <Col span={8}>
            <Statistic
              title="History"
              value={
                displayedEntryInfo.recordCount !== 0n
                  ? getHistory(displayedEntryInfo)
                  : "---"
              }
              loading={isCardLoading}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={`Oldest Record ${showUnix ? "(Unix)" : "(UTC)"}`}
              value={printTimestamp(
                displayedEntryInfo.oldestRecord,
                displayedEntryInfo.recordCount,
              )}
              loading={isCardLoading}
              groupSeparator=""
              valueRender={(val) => (
                <span style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                  {val}
                </span>
              )}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={`Latest Record ${showUnix ? "(Unix)" : "(UTC)"}`}
              value={printTimestamp(
                displayedEntryInfo.latestRecord,
                displayedEntryInfo.recordCount,
              )}
              loading={isCardLoading}
              groupSeparator=""
              valueRender={(val) => (
                <span style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                  {val}
                </span>
              )}
            />
          </Col>
        </Row>
        {(props.allEntries?.some((e) =>
          e.name.startsWith(`${entryInfo.name}/`),
        ) ??
          false) && (
          <Segmented
            size="small"
            value={showAggregated ? "aggregated" : "single"}
            options={[
              { label: "This entry", value: "single" },
              { label: "Include sub-entries", value: "aggregated" },
            ]}
            onChange={(val) => setShowAggregated(val === "aggregated")}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
      <RemoveConfirmationModal
        key={entryToRemove}
        name={entryToRemove}
        onRemove={() => removeEntry(entryToRemove)}
        onCancel={() => setEntryToRemove("")}
        resourceType="entry"
        open={entryToRemove !== ""}
      />
    </>
  );
}
