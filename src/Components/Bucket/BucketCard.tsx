import React, { useState, useEffect } from "react";
import { Card, Col, Modal, Row, Statistic, Tag } from "antd";
import humanizeDuration from "humanize-duration";
import {
  APIError,
  Bucket,
  BucketInfo,
  Client,
  TokenPermissions,
} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {
  DeleteOutlined,
  SettingOutlined,
  UploadOutlined,
} from "@ant-design/icons";

import "./BucketCard.css";
import BucketSettingsForm from "./BucketSettingsForm";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import { bigintToNumber } from "../../Helpers/NumberUtils";

interface Props {
  bucketInfo: BucketInfo;
  client: Client;
  index: number;
  showPanel?: boolean;
  onRemoved: (name: string) => void;
  onShow: (name: string) => void;
  permissions?: TokenPermissions;
  onUpload?: () => void;
  hasWritePermission?: boolean;
}

export const getHistory = (interval: {
  latestRecord: bigint;
  oldestRecord: bigint;
}) => {
  return humanizeDuration(
    Number((interval.latestRecord - interval.oldestRecord) / 1000n),
    { largest: 1, round: true },
  );
};

export default function BucketCard(props: Readonly<Props>) {
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [changeSettings, setChangeSettings] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [bucketInfo, setBucketInfo] = useState(props.bucketInfo);
  const { client, index } = props;

  useEffect(() => {
    setBucketInfo(props.bucketInfo);
  }, [props.bucketInfo]);

  const onRemove = async () => {
    try {
      const bucket: Bucket = await client.getBucket(bucketInfo.name);
      await bucket.remove();
      props.onRemoved(bucketInfo.name);
      setRemoveError(null);
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove bucket.");
    }
  };

  const actions = [];
  const readOnly = !props.permissions?.fullAccess || bucketInfo.isProvisioned;
  if (props.showPanel) {
    if (props.hasWritePermission) {
      actions.push(
        <UploadOutlined
          title="Upload File"
          key="upload"
          onClick={(e) => {
            e.stopPropagation();
            props.onUpload?.();
          }}
        />,
      );
    }

    actions.push(
      <SettingOutlined
        title="Settings"
        key="setting"
        onClick={() => setChangeSettings(true)}
      />,
    );

    if (!readOnly) {
      actions.push(
        <DeleteOutlined
          title="Remove"
          key="delete"
          style={{ color: "red" }}
          onClick={() => setIsRemoveModalOpen(true)}
        />,
      );
    }
  }

  return (
    <Card
      className="BucketCard"
      key={index}
      id={bucketInfo.name}
      title={bucketInfo.name}
      extra={
        bucketInfo.isProvisioned ? (
          <Tag color="processing">Provisioned</Tag>
        ) : (
          <></>
        )
      }
      hoverable={props.showPanel != true}
      onClick={() => props.onShow(bucketInfo.name)}
      actions={actions}
    >
      <Card.Meta></Card.Meta>
      <Row gutter={24}>
        <Col span={8}>
          <Statistic
            title="Size"
            value={prettierBytes(bigintToNumber(bucketInfo.size))}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Entries"
            value={bigintToNumber(bucketInfo.entryCount)}
          />
        </Col>
        <Col span={10}>
          <Statistic
            title="History"
            value={bucketInfo.entryCount > 0n ? getHistory(bucketInfo) : "---"}
          />
        </Col>
      </Row>
      <RemoveConfirmationModal
        name={bucketInfo.name}
        onRemove={onRemove}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        open={isRemoveModalOpen}
        resourceType="bucket"
        errorMessage={removeError}
      />
      <Modal
        title="Settings"
        open={changeSettings}
        footer={null}
        onCancel={() => setChangeSettings(false)}
      >
        <BucketSettingsForm
          client={client}
          key={bucketInfo.name}
          bucketName={bucketInfo.name}
          readOnly={readOnly}
          onCreated={() => setChangeSettings(false)}
        />
      </Modal>
    </Card>
  );
}
