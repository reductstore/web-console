import React, { useEffect, useState } from "react";
import { Card, Col, message, Row, Statistic, Tag } from "antd";
import {
  DeleteOutlined,
  LoadingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { APIError, EntryInfo, Status, TokenPermissions, Client } from "reduct-js";
import { useHistory } from "react-router-dom";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { getHistory } from "../Bucket/BucketCard";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import ActionIcon from "../ActionIcon";
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
}

export default function EntryCard(props: Readonly<Props>) {
  const { entryInfo, bucketName, permissions, onRemoved, showUnix } = props;
  const history = useHistory();
  const [entryToRemove, setEntryToRemove] = useState<string>("");
  const [entryStatus, setEntryStatus] = useState(entryInfo.status);
  const deletionTooltip = "Deletion in progress. Action disabled.";
  const isDeleting = entryStatus === Status.DELETING;

  useEffect(() => {
    setEntryStatus(entryInfo.status);
  }, [entryInfo.status]);

  const printTimestamp = (timestamp: bigint) => {
    if (entryInfo.recordCount === 0n) return "---";
    if (showUnix) return Number(timestamp);
    return new Date(Number(timestamp / 1_000n))
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
  };

  const handleClick = () => {
    history.push(`/buckets/${bucketName}`);
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

  const actions = [];
  if (props.hasWritePermission) {
    actions.push(
      <ActionIcon
        key="upload"
        icon={<UploadOutlined title="Upload File" />}
        disabled={isDeleting}
        tooltip={deletionTooltip}
        onClick={() => props.onUpload?.()}
      />,
    );
  }
  if (
    permissions?.fullAccess ||
    (permissions?.write && permissions.write.indexOf(bucketName) !== -1)
  ) {
    actions.push(
      <ActionIcon
        key="delete"
        icon={<DeleteOutlined title="Remove entry" style={{ color: "red" }} />}
        disabled={isDeleting}
        tooltip={deletionTooltip}
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
              <a onClick={handleClick}>{bucketName}</a>/{entryInfo.name}
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
              value={prettierBytes(Number(entryInfo.size))}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Records"
              value={entryInfo.recordCount.toString()}
            />
          </Col>
          <Col span={8}>
            <Statistic title="Blocks" value={entryInfo.blockCount.toString()} />
          </Col>
        </Row>
        <Row gutter={24} style={{ marginTop: "1em" }}>
          <Col span={8}>
            <Statistic
              title="History"
              value={
                entryInfo.recordCount !== 0n ? getHistory(entryInfo) : "---"
              }
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={`Oldest Record ${showUnix ? "(Unix)" : "(UTC)"}`}
              value={printTimestamp(entryInfo.oldestRecord)}
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
              value={printTimestamp(entryInfo.latestRecord)}
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
