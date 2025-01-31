import React, { useState } from "react";
import { Card, Col, Modal, Row, Statistic, Tag } from "antd";
import {
  APIError,
  Client,
  FullReplicationInfo,
  TokenPermissions,
} from "reduct-js";
import { DeleteOutlined, SettingOutlined } from "@ant-design/icons";

import "./ReplicationCard.css";
import ReplicationSettingsForm from "./ReplicationSettingsForm";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import { bigintToNumber } from "../../Helpers/NumberUtils";

interface Props {
  replication: FullReplicationInfo;
  client: Client;
  index: number;
  sourceBuckets: string[];
  showPanel?: boolean;
  onRemove: (name: string) => void;
  onShow: (name: string) => void;
  permissions?: TokenPermissions;
}

export default function ReplicationCard(props: Readonly<Props>) {
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [changeSettings, setChangeSettings] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const { client, replication, index } = props;
  const { info, diagnostics } = replication;

  const onRemove = async () => {
    try {
      await client.deleteReplication(info.name);
      props.onRemove(info.name);
      setRemoveError(null);
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove replication.");
    }
  };

  const actions = [];
  const readOnly = !props.permissions?.fullAccess || info.isProvisioned;
  if (props.showPanel) {
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
      className="ReplicationCard"
      key={index}
      id={info.name}
      title={info.name}
      extra={
        info.isProvisioned ? <Tag color="processing">Provisioned</Tag> : <></>
      }
      hoverable={props.showPanel != true}
      onClick={() => props.onShow(info.name)}
      actions={actions}
    >
      <Card.Meta></Card.Meta>
      <Row gutter={24}>
        <Col span={8}>
          <Statistic
            title="Records Awaiting Replication"
            value={bigintToNumber(info.pendingRecords)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Successfully Replicated (Past Hour)"
            value={bigintToNumber(diagnostics.hourly.ok)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Errors (Past Hour)"
            value={bigintToNumber(diagnostics.hourly.errored)}
          />
        </Col>
      </Row>
      <RemoveConfirmationModal
        name={info.name}
        onRemove={onRemove}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        open={isRemoveModalOpen}
        resourceType="replication"
        errorMessage={removeError}
      />
      <Modal
        title="Settings"
        open={changeSettings}
        footer={null}
        onCancel={() => setChangeSettings(false)}
        data-testid="settings-modal"
      >
        <ReplicationSettingsForm
          key={info.name}
          client={client}
          readOnly={readOnly}
          onCreated={() => setChangeSettings(false)}
          sourceBuckets={props.sourceBuckets}
          replicationName={info.name}
        />
      </Modal>
    </Card>
  );
}
