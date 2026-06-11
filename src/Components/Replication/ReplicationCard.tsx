import React, { useState } from "react";
import {
  Badge,
  Card,
  Col,
  message,
  Modal,
  Row,
  Space,
  Statistic,
  Tag,
  theme,
  Tooltip,
} from "antd";
import {
  APIError,
  Client,
  FullReplicationInfo,
  ReplicationMode,
  TokenPermissions,
} from "reduct-js";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import "./ReplicationCard.css";
import {
  MODE_DROPDOWN_OPTIONS,
  getReplicationStatus,
} from "./ReplicationModeUtils";
import ModeDropdown from "../ModeDropdown";
import ReplicationSettingsForm from "./ReplicationSettingsForm";
import RemoveConfirmationModal from "../RemoveConfirmationModal";
import { bigintToNumber } from "../../Helpers/NumberUtils";

interface Props {
  replication: FullReplicationInfo;
  client: Client;
  index: number;
  sourceBuckets: string[];
  showPanel?: boolean;
  onBack?: () => void;
  onRemove: (name: string) => void;
  onShow: (name: string) => void;
  onModeChange?: (name: string, mode: ReplicationMode) => void;
  permissions?: TokenPermissions;
}

export default function ReplicationCard(props: Readonly<Props>) {
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [changeSettings, setChangeSettings] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [changingMode, setChangingMode] = useState(false);
  const { token } = theme.useToken();
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
        message.error(`Failed to change replication mode: ${err.message}`);
      } else {
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
    if (props.onBack) {
      actions.push(
        <Tooltip title="Back" key="back">
          <ArrowLeftOutlined onClick={props.onBack} />
        </Tooltip>,
      );
    }
    actions.push(
      <span
        key="mode"
        aria-label="Change mode"
        data-testid="mode-select"
        style={{
          display: "inline-flex",
          alignItems: "center",
          verticalAlign: "-0.25em",
        }}
      >
        <ModeDropdown
          mode={info.mode}
          options={MODE_DROPDOWN_OPTIONS}
          onChange={onModeChange}
          disabled={!canChangeMode || changingMode}
        />
      </span>,
    );
    actions.push(
      <Tooltip title="Settings" key="setting">
        <SettingOutlined onClick={() => setChangeSettings(true)} />
      </Tooltip>,
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
    const { status, text, colorToken } = getReplicationStatus(
      info.mode,
      info.isActive,
    );
    return (
      <Badge
        color={colorToken ? token[colorToken] : undefined}
        status={status}
        text={text}
      />
    );
  };

  return (
    <Card
      className="ReplicationCard"
      key={index}
      id={info.name}
      title={
        <span>
          {info.name}
          {info.isProvisioned ? (
            <Tag
              color="default"
              style={{ marginLeft: 8, fontWeight: "normal" }}
            >
              Provisioned
            </Tag>
          ) : null}
        </span>
      }
      extra={<Space size="small">{getStatusTags()}</Space>}
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
        centered
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
