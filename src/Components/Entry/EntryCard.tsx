import React, { useEffect, useMemo, useState } from "react";
import { Card, Col, message, Row, Statistic, Tag } from "antd";
import {
  DeleteOutlined,
  LoadingOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
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
import { getHistory } from "../Bucket/BucketCard";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import ActionIcon from "../ActionIcon";
import EntryBreadcrumb from "./EntryBreadcrumb";
import EntryNavTree from "./EntryNavTree";
import "./EntryCard.css";

interface Props {
  entryInfo: EntryInfo;
  bucketName: string;
  permissions?: TokenPermissions;
  showUnix?: boolean;
  client: Client;
  onRemoved?: () => void;
  onUpload?: () => void;
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
  const [showAggregated, setShowAggregated] = useState(true);

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
      onRemoved?.();
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

  const actions = [];
  if (props.hasWritePermission) {
    actions.push(
      <ActionIcon
        key="upload"
        icon={<UploadOutlined title="Upload File" />}
        disabled={isDeleting}
        tooltip={isDeleting ? deletionTooltip : "Upload file"}
        showTooltipWhenEnabled
        onClick={() => props.onUpload?.()}
      />,
    );
  }

  actions.push(
    <ActionIcon
      key="toggle-aggregated"
      icon={
        showAggregated ? (
          <NodeCollapseOutlined title="Entry Stats" />
        ) : (
          <NodeExpandOutlined title="Entry + Sub-entry Stats" />
        )
      }
      tooltip={showAggregated ? "Entry Stats" : "Entry + Sub-entry Stats"}
      showTooltipWhenEnabled
      onClick={() => {
        window.requestAnimationFrame(() => {
          setShowAggregated((prev) => !prev);
        });
      }}
    />,
  );

  if (
    permissions?.fullAccess ||
    (permissions?.write && permissions.write.indexOf(bucketName) !== -1)
  ) {
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
