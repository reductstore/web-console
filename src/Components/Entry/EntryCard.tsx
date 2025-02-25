import React, { useState } from "react";
import { Card, Col, Row, Statistic } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { EntryInfo, TokenPermissions, Client } from "reduct-js";
import { useHistory } from "react-router-dom";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { getHistory } from "../Bucket/BucketCard";
import RemoveConfirmationModal from "../RemoveConfirmationModal";

interface Props {
  entryInfo: EntryInfo;
  bucketName: string;
  permissions?: TokenPermissions;
  showUnix?: boolean;
  client: Client;
  onRemoved?: () => void;
}

export default function EntryCard(props: Readonly<Props>) {
  const { entryInfo, bucketName, permissions, onRemoved, showUnix } = props;
  const history = useHistory();
  const [entryToRemove, setEntryToRemove] = useState<string>("");

  const printTimestamp = (timestamp: bigint) => {
    if (entryInfo.recordCount === 0n) return "---";
    return showUnix
      ? Number(timestamp)
      : new Date(Number(timestamp / 1000n)).toISOString();
  };

  const handleClick = () => {
    history.push(`/buckets/${bucketName}`);
  };

  const removeEntry = async (name: string) => {
    const { client, bucketName } = props;
    const bucket = await client.getBucket(bucketName);
    await bucket.removeEntry(name);
    setEntryToRemove("");
    onRemoved?.();
  };

  const actions = [];
  if (
    permissions?.fullAccess ||
    (permissions?.write && permissions.write.indexOf(bucketName) !== -1)
  ) {
    actions.push(
      <DeleteOutlined
        key="delete"
        style={{ color: "red" }}
        title="Remove entry"
        onClick={() => setEntryToRemove(entryInfo.name)}
      />,
    );
  }

  return (
    <>
      <Card
        className="EntryCard"
        title={
          <p>
            <a onClick={handleClick}>{bucketName}</a>/{entryInfo.name}
          </p>
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
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={`Latest Record ${showUnix ? "(Unix)" : "(UTC)"}`}
              value={printTimestamp(entryInfo.latestRecord)}
              groupSeparator=""
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
