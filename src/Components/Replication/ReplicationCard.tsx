import React, { useState } from "react";
import {
  Card,
  Col,
  message,
  Modal,
  Row,
  Select,
  Statistic,
  Tag,
  Tooltip,
} from "antd";
import {
  APIError,
  Client,
  FullReplicationInfo,
  ReplicationMode,
  TokenPermissions,
} from "reduct-js";
import { DeleteOutlined, SettingOutlined } from "@ant-design/icons";

import "./ReplicationCard.css";
import { MODE_SELECT_OPTIONS, MODE_SELECT_STYLE } from "./ReplicationModeUtils";
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
  onModeChange?: (name: string, mode: ReplicationMode) => void;
  permissions?: TokenPermissions;
}

export default function ReplicationCard(props: Readonly<Props>) {
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [changeSettings, setChangeSettings] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);
  const [changingMode, setChangingMode] = useState(false);
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

  const onModeChange = async (newMode: ReplicationMode) => {
    setChangingMode(true);
    setModeError(null);
    try {
      await client.setReplicationMode(info.name, newMode);
      props.onModeChange?.(info.name, newMode);
      if (newMode === ReplicationMode.ENABLED) {
        message.success(`Replication "${info.name}" enabled.`);
      } else if (newMode === ReplicationMode.PAUSED) {
        message.success(`Replication "${info.name}" paused.`);
      } else if (newMode === ReplicationMode.DISABLED) {
        message.success(`Replication "${info.name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        setModeError(err.message);
        message.error(`Failed to change replication mode: ${err.message}`);
      } else {
        setModeError("Failed to change replication mode.");
        message.error("Failed to change replication mode.");
      }
    } finally {
      setChangingMode(false);
    }
  };

  const actions = [];
  const readOnly = !props.permissions?.fullAccess || info.isProvisioned;
  const canChangeMode = props.permissions?.fullAccess;
  if (props.showPanel) {
    actions.push(
      <div
        key="mode"
        onClick={(e) => e.stopPropagation()}
        style={{ display: "inline-block" }}
      >
        <Select
          style={MODE_SELECT_STYLE}
          value={info.mode}
          onChange={onModeChange}
          loading={changingMode}
          disabled={!canChangeMode}
          status={modeError ? "error" : undefined}
          data-testid="mode-select"
          size="small"
          options={MODE_SELECT_OPTIONS}
        />
      </div>,
    );

    actions.push(
      <SettingOutlined
        title="Settings"
        key="setting"
        onClick={() => setChangeSettings(true)}
      />,
    );

    if (readOnly) {
      actions.push(
        <Tooltip
          key="delete"
          title={
            info.isProvisioned
              ? "Cannot remove provisioned replication"
              : "No permission to remove"
          }
        >
          <DeleteOutlined
            title="Remove"
            style={{ color: "gray", cursor: "not-allowed" }}
          />
        </Tooltip>,
      );
    } else {
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

  const getStatusTags = () => {
    const tags = [];
    if (info.mode === ReplicationMode.DISABLED) {
      tags.push(
        <Tag key="disabled" color="default">
          Inactive
        </Tag>,
      );
    } else if (info.isActive) {
      tags.push(
        <Tag key="reachable" color="success">
          Target Reachable
        </Tag>,
      );
    } else {
      tags.push(
        <Tag key="unreachable" color="error">
          Target Unreachable
        </Tag>,
      );
    }
    if (info.isProvisioned) {
      tags.push(
        <Tag key="provisioned" color="processing">
          Provisioned
        </Tag>,
      );
    }
    return tags;
  };

  return (
    <Card
      className="ReplicationCard"
      key={index}
      id={info.name}
      title={info.name}
      extra={<div className="ReplicationCard-status">{getStatusTags()}</div>}
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
