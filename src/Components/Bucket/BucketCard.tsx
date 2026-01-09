import React, { useState, useEffect } from "react";
import { Card, Col, message, Modal, Row, Space, Statistic, Tag } from "antd";
import humanizeDuration from "humanize-duration";
import {
  APIError,
  Bucket,
  BucketInfo,
  Client,
  Status,
  TokenPermissions,
} from "reduct-js";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import {
  DeleteOutlined,
  SettingOutlined,
  UploadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";

import "./BucketCard.css";
import BucketSettingsForm from "./BucketSettingsForm";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import { bigintToNumber } from "../../Helpers/NumberUtils";
import ActionIcon from "../ActionIcon";

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
  const deletionTooltip = "Deletion in progress. Action disabled.";
  const isDeleting = bucketInfo.status === Status.DELETING;

  useEffect(() => {
    setBucketInfo(props.bucketInfo);
  }, [props.bucketInfo]);

  const onRemove = async () => {
    const previousStatus = bucketInfo.status ?? Status.READY;
    setIsRemoveModalOpen(false);
    setBucketInfo((prevBucketInfo) => ({
      ...prevBucketInfo,
      status: Status.DELETING,
    }));
    try {
      const bucket: Bucket = await client.getBucket(bucketInfo.name);
      await bucket.remove();
      props.onRemoved(bucketInfo.name);
    } catch (err) {
      console.error(err);
      const errorMsg =
        err instanceof APIError && err.message
          ? err.message
          : "Failed to remove bucket.";
      message.error(errorMsg);
      setBucketInfo((prevBucketInfo) => ({
        ...prevBucketInfo,
        status: previousStatus,
      }));
    }
  };

  const actions = [];
  const readOnly = !props.permissions?.fullAccess || bucketInfo.isProvisioned;
  if (props.showPanel) {
    if (props.hasWritePermission) {
      actions.push(
        <ActionIcon
          key="upload"
          icon={<UploadOutlined title="Upload File" />}
          disabled={isDeleting}
          tooltip={deletionTooltip}
          onClick={(e) => {
            e.stopPropagation();
            props.onUpload?.();
          }}
        />,
      );
    }

    actions.push(
      <ActionIcon
        key="setting"
        icon={<SettingOutlined title="Settings" />}
        disabled={isDeleting}
        tooltip={deletionTooltip}
        onClick={() => setChangeSettings(true)}
      />,
    );

    if (!readOnly) {
      actions.push(
        <ActionIcon
          key="delete"
          icon={<DeleteOutlined title="Remove" style={{ color: "red" }} />}
          disabled={isDeleting}
          tooltip={deletionTooltip}
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
        bucketInfo.isProvisioned || isDeleting ? (
          <Space size="small">
            {bucketInfo.isProvisioned ? (
              <Tag color="processing">Provisioned</Tag>
            ) : null}
            {isDeleting ? (
              <Tag color="processing" icon={<LoadingOutlined spin />}>
                Deleting
              </Tag>
            ) : null}
          </Space>
        ) : null
      }
      hoverable={props.showPanel != true && !isDeleting}
      onClick={() => !isDeleting && props.onShow(bucketInfo.name)}
      style={isDeleting ? { cursor: "not-allowed", opacity: 0.7 } : undefined}
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
