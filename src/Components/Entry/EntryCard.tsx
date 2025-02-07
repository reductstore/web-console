import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { EntryInfo, TokenPermissions } from "reduct-js";
import { useHistory } from "react-router-dom";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { getHistory } from "../Bucket/BucketCard";

interface Props {
  entryInfo: EntryInfo;
  bucketName: string;
  permissions?: TokenPermissions;
  onDelete?: () => void;
  showUnix?: boolean;
}

export default function EntryCard(props: Readonly<Props>) {
  const { entryInfo, bucketName, permissions, onDelete, showUnix } = props;
  const history = useHistory();

  const printIsoDate = (timestamp: bigint) => {
    if (entryInfo.recordCount === 0n) return "---";
    return showUnix 
      ? timestamp.toString()
      : new Date(Number(timestamp / 1000n)).toISOString();
  };

  const handleClick = () => {
    history.push(`/buckets/${bucketName}`);
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
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
      />,
    );
  }

  return (
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
          <Statistic title="Records" value={entryInfo.recordCount.toString()} />
        </Col>
        <Col span={8}>
          <Statistic title="Blocks" value={entryInfo.blockCount.toString()} />
        </Col>
      </Row>
      <Row gutter={24} style={{ marginTop: "1em" }}>
        <Col span={8}>
          <Statistic
            title="History"
            value={entryInfo.recordCount !== 0n ? getHistory(entryInfo) : "---"}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Oldest Record (UTC)"
            value={printIsoDate(entryInfo.oldestRecord)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Latest Record (UTC)"
            value={printIsoDate(entryInfo.latestRecord)}
          />
        </Col>
      </Row>
    </Card>
  );
}
