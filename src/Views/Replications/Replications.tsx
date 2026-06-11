import React, { useEffect, useState } from "react";
import {
  APIError,
  ReplicationInfo,
  ReplicationMode,
  Client,
  TokenPermissions,
  BucketInfo,
} from "reduct-js";
import {
  Badge,
  Button,
  Flex,
  message,
  Modal,
  Table,
  Tag,
  theme,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import "../../App.css";
import {
  MODE_DROPDOWN_OPTIONS,
  getReplicationStatus,
} from "../../Components/Replication/ReplicationModeUtils";
import ModeDropdown from "../../Components/ModeDropdown";
import { Link } from "react-router-dom";
import ReplicationSettingsForm from "../../Components/Replication/ReplicationSettingsForm";
import { useSelectionMode } from "../../hooks/useSelectionMode";
import { useBulkDelete } from "../../hooks/useBulkDelete";
import BulkRemoveConfirmationModal from "../../Components/BulkRemoveConfirmationModal";
import BulkModeChangeModal from "../../Components/Replication/BulkModeChangeModal";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import ActionIcon from "../../Components/ActionIcon";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

interface ReplicationRow {
  key: string;
  name: string;
  isActive: boolean;
  mode: ReplicationMode;
  isProvisioned: boolean;
  pendingRecords: string;
}

/**
 * Replications View
 */
export default function Replications(props: Readonly<Props>) {
  const { token } = theme.useToken();
  const [replications, setReplications] = useState<ReplicationInfo[]>([]);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingReplications, setIsLoadingReplications] = useState(true);

  const [creatingReplication, setCreatingReplication] = useState(false);
  const [changingMode, setChangingMode] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkModeChangeOpen, setIsBulkModeChangeOpen] = useState(false);
  const [replicationToRemove, setReplicationToRemove] = useState<string>("");
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [bulkModeChanging, setBulkModeChanging] = useState(false);
  const [bulkModeProgress, setBulkModeProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkModeError, setBulkModeError] = useState<string | null>(null);
  const [replicationToEdit, setReplicationToEdit] = useState<string>("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const { selectedKeys, clearSelection, rowSelection } = useSelectionMode();

  const {
    handleBulkDelete,
    bulkDeleting,
    bulkProgress,
    bulkError,
    setBulkError,
  } = useBulkDelete({
    onDelete: (name) => props.client.deleteReplication(name),
    onSuccess: () => {
      setIsBulkDeleteOpen(false);
      clearSelection();
      getReplications();
    },
    onError: (failures) => {
      message.error(`${failures.length} replication(s) failed to remove`);
    },
  });

  const handleBulkModeChange = async (mode: ReplicationMode) => {
    setBulkModeChanging(true);
    setBulkModeError(null);
    const total = selectedKeys.length;
    let done = 0;
    const failures: string[] = [];

    for (const name of selectedKeys) {
      try {
        await props.client.setReplicationMode(name, mode);
        done++;
        setBulkModeProgress({ done, total });
      } catch (err: any) {
        failures.push(`${name}: ${err.message || "failed"}`);
        done++;
        setBulkModeProgress({ done, total });
      }
      if (done < total) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setBulkModeChanging(false);
    setBulkModeProgress(null);

    if (failures.length > 0) {
      setBulkModeError(
        `${failures.length} replication(s) failed to change mode`,
      );
      message.error(`${failures.length} replication(s) failed to change mode`);
    }

    setIsBulkModeChangeOpen(false);
    clearSelection();
    getReplications();
  };

  const onRemoveReplication = async () => {
    try {
      await props.client.deleteReplication(replicationToRemove);
      setIsRemoveModalOpen(false);
      setRemoveError(null);
      getReplications();
    } catch (err: any) {
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove replication.");
    }
  };

  const onModeChange = async (name: string, newMode: ReplicationMode) => {
    setChangingMode(name);
    try {
      await props.client.setReplicationMode(name, newMode);
      await getReplications();
      if (newMode === ReplicationMode.ENABLED) {
        message.success(`Replication "${name}" enabled.`);
      } else if (newMode === ReplicationMode.PAUSED) {
        message.success(`Replication "${name}" paused.`);
      } else if (newMode === ReplicationMode.DISABLED) {
        message.success(`Replication "${name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        message.error(`Failed to change replication mode: ${err.message}`);
      } else {
        message.error("Failed to change replication mode.");
      }
    } finally {
      setChangingMode(null);
    }
  };

  const getReplications = async () => {
    try {
      setIsLoadingReplications(true);
      const { client } = props;
      setReplications(await client.getReplicationList());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReplications(false);
    }
  };

  const getBuckets = async () => {
    try {
      const { client } = props;
      const bucketList: BucketInfo[] = await client.getBucketList();
      setBuckets(bucketList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getReplications().then();
    const interval = setInterval(() => getReplications(), 5000);
    return () => clearInterval(interval);
  }, [creatingReplication]);

  useEffect(() => {
    getBuckets().then();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const data = replications.map((replication) => {
    return {
      key: replication.name,
      name: replication.name,
      isActive: replication.isActive,
      mode: replication.mode,
      isProvisioned: replication.isProvisioned,
      pendingRecords: replication.pendingRecords.toString(),
    };
  });

  const provisionedNames = new Set(
    replications.filter((r) => r.isProvisioned).map((r) => r.name),
  );
  const deletableKeys = selectedKeys.filter((k) => !provisionedNames.has(k));
  const provisionedSelectedCount = selectedKeys.length - deletableKeys.length;

  const columns: ColumnsType<ReplicationRow> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Link to={`/replications/${text}`}>
          <b>{text}</b>
        </Link>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const { status, text, colorToken } = getReplicationStatus(
          record.mode,
          record.isActive,
        );
        return (
          <Badge
            color={colorToken ? token[colorToken] : undefined}
            status={status}
            text={text}
          />
        );
      },
    },
    {
      title: "Pending Records",
      dataIndex: "pendingRecords",
      key: "pendingRecords",
    },
    {
      title: "Provisioned",
      key: "provisioned",
      render: (_, record) =>
        record.isProvisioned ? <Tag color="default">Provisioned</Tag> : null,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => {
        if (!props.permissions?.fullAccess) {
          return null;
        }
        return (
          <Flex gap="middle" align="center">
            <ModeDropdown
              mode={record.mode}
              options={MODE_DROPDOWN_OPTIONS}
              onChange={(newMode) => onModeChange(record.name, newMode)}
              disabled={changingMode !== null}
              fontSize={16}
            />
            <ActionIcon
              icon={<SettingOutlined style={{ fontSize: "16px" }} />}
              onClick={() => {
                setReplicationToEdit(record.name);
                setIsSettingsModalOpen(true);
              }}
              tooltip="Settings"
              showTooltipWhenEnabled
            />
            {record.isProvisioned ? (
              <ActionIcon
                icon={<DeleteOutlined style={{ fontSize: "16px" }} />}
                disabled
                tooltip="Provisioned replications cannot be removed"
                showTooltipWhenEnabled
              />
            ) : (
              <ActionIcon
                icon={
                  <DeleteOutlined
                    style={{ fontSize: "16px", color: "#ff4d4f" }}
                  />
                }
                onClick={() => {
                  setReplicationToRemove(record.name);
                  setRemoveError(null);
                  setIsRemoveModalOpen(true);
                }}
                tooltip="Delete replication"
                showTooltipWhenEnabled
              />
            )}
          </Flex>
        );
      },
    },
  ];

  return (
    <div style={{ margin: "2em" }}>
      <Typography.Title level={3}>
        Replications
        {props.permissions?.fullAccess ? (
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => setCreatingReplication(true)}
            title="Add"
          />
        ) : null}
        {props.permissions?.fullAccess ? (
          <>
            <Tooltip
              title={
                selectedKeys.length > 0
                  ? deletableKeys.length > 0
                    ? `Delete ${deletableKeys.length} selected`
                    : "All selected replications are provisioned"
                  : "Select replications to delete"
              }
              placement="bottomLeft"
            >
              <Button
                style={{ float: "right", marginRight: 8 }}
                icon={<DeleteOutlined />}
                onClick={() => setIsBulkDeleteOpen(true)}
                danger
                disabled={deletableKeys.length === 0}
              />
            </Tooltip>
            <Tooltip
              title={
                selectedKeys.length > 0
                  ? `Change mode for ${selectedKeys.length} selected`
                  : "Select replications to change mode"
              }
              placement="bottomLeft"
            >
              <Button
                style={{ float: "right", marginRight: 8 }}
                icon={<SwapOutlined />}
                onClick={() => setIsBulkModeChangeOpen(true)}
                disabled={selectedKeys.length === 0}
              />
            </Tooltip>
          </>
        ) : null}
        <Modal
          title="Add a new replication"
          open={creatingReplication}
          footer={null}
          centered
          destroyOnHidden
          onCancel={() => setCreatingReplication(false)}
        >
          <ReplicationSettingsForm
            client={props.client}
            onCreated={async () => {
              setCreatingReplication(false);
            }}
            sourceBuckets={buckets.map((bucket) => bucket.name)}
          />
        </Modal>
      </Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={isLoadingReplications}
        rowSelection={props.permissions?.fullAccess ? rowSelection : undefined}
      />
      <BulkRemoveConfirmationModal
        count={deletableKeys.length}
        resourceType="replication"
        open={isBulkDeleteOpen}
        onConfirm={() => handleBulkDelete(deletableKeys)}
        onCancel={() => {
          setIsBulkDeleteOpen(false);
          setBulkError(null);
        }}
        loading={bulkDeleting}
        progress={bulkProgress ?? undefined}
        errorMessage={bulkError}
        warningMessage={
          provisionedSelectedCount > 0
            ? `${provisionedSelectedCount} provisioned replication(s) will be skipped.`
            : null
        }
      />
      <BulkModeChangeModal
        count={selectedKeys.length}
        open={isBulkModeChangeOpen}
        onConfirm={handleBulkModeChange}
        onCancel={() => {
          setIsBulkModeChangeOpen(false);
          setBulkModeError(null);
        }}
        loading={bulkModeChanging}
        progress={bulkModeProgress ?? undefined}
        errorMessage={bulkModeError}
      />
      <RemoveConfirmationModal
        name={replicationToRemove}
        onRemove={onRemoveReplication}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        resourceType="replication"
        open={isRemoveModalOpen}
        errorMessage={removeError}
      />
      <Modal
        title="Settings"
        open={isSettingsModalOpen}
        footer={null}
        centered
        onCancel={() => setIsSettingsModalOpen(false)}
      >
        <ReplicationSettingsForm
          client={props.client}
          key={replicationToEdit}
          replicationName={replicationToEdit}
          readOnly={
            replications.find((r) => r.name === replicationToEdit)
              ?.isProvisioned
          }
          onCreated={() => {
            setIsSettingsModalOpen(false);
            getReplications();
          }}
          sourceBuckets={buckets.map((bucket) => bucket.name)}
        />
      </Modal>
    </div>
  );
}
