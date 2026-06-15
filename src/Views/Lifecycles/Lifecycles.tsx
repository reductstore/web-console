import React, { useEffect, useState } from "react";
import {
  APIError,
  BucketInfo,
  Client,
  LifecycleInfo,
  LifecycleMode,
  LifecycleType,
  TokenPermissions,
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
import {
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  SwapOutlined,
} from "@ant-design/icons";

import type { ColumnsType } from "antd/es/table";
import LifecycleSettingsForm from "../../Components/Lifecycle/LifecycleSettingsForm";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import BulkRemoveConfirmationModal from "../../Components/BulkRemoveConfirmationModal";
import BulkModeChangeModal from "../../Components/Lifecycle/BulkModeChangeModal";
import ActionIcon from "../../Components/ActionIcon";
import ModeDropdown from "../../Components/ModeDropdown";
import { useSelectionMode } from "../../hooks/useSelectionMode";
import { useBulkDelete } from "../../hooks/useBulkDelete";
import {
  MODE_DROPDOWN_OPTIONS,
  getLifecycleStatus,
  getLifecycleTypeColor,
  getLifecycleTypeLabel,
} from "../../Components/Lifecycle/LifecycleModeUtils";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

interface LifecycleRow {
  key: string;
  name: string;
  mode: LifecycleMode;
  type: LifecycleType;
  isRunning: boolean;
  isProvisioned: boolean;
}

export default function Lifecycles(props: Readonly<Props>) {
  const { token } = theme.useToken();
  const [lifecycles, setLifecycles] = useState<LifecycleInfo[]>([]);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingLifecycles, setIsLoadingLifecycles] = useState(true);

  const [creatingLifecycle, setCreatingLifecycle] = useState(false);
  const [changingMode, setChangingMode] = useState<string | null>(null);
  const [lifecycleToEdit, setLifecycleToEdit] = useState<string>("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [lifecycleToRemove, setLifecycleToRemove] = useState<string>("");
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkModeChangeOpen, setIsBulkModeChangeOpen] = useState(false);
  const [bulkModeChanging, setBulkModeChanging] = useState(false);
  const [bulkModeProgress, setBulkModeProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkModeError, setBulkModeError] = useState<string | null>(null);

  const { selectedKeys, clearSelection, rowSelection } = useSelectionMode();

  const {
    handleBulkDelete,
    bulkDeleting,
    bulkProgress,
    bulkError,
    setBulkError,
  } = useBulkDelete({
    onDelete: (name) => props.client.deleteLifecycle(name),
    onSuccess: () => {
      setIsBulkDeleteOpen(false);
      clearSelection();
      getLifecycles();
    },
    onError: (failures) => {
      message.error(`${failures.length} lifecycle(s) failed to remove`);
    },
  });

  const handleBulkModeChange = async (mode: LifecycleMode) => {
    setBulkModeChanging(true);
    setBulkModeError(null);
    const total = selectedKeys.length;
    let done = 0;
    const failures: string[] = [];

    for (const name of selectedKeys) {
      try {
        await props.client.setLifecycleMode(name, mode);
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
      setBulkModeError(`${failures.length} lifecycle(s) failed to change mode`);
      message.error(`${failures.length} lifecycle(s) failed to change mode`);
    }

    setIsBulkModeChangeOpen(false);
    clearSelection();
    getLifecycles();
  };

  const onRemoveLifecycle = async () => {
    try {
      await props.client.deleteLifecycle(lifecycleToRemove);
      setIsRemoveModalOpen(false);
      setRemoveError(null);
      await getLifecycles();
    } catch (err) {
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove lifecycle.");
    }
  };

  const onModeChange = async (name: string, newMode: LifecycleMode) => {
    setChangingMode(name);
    try {
      await props.client.setLifecycleMode(name, newMode);
      await getLifecycles();

      if (newMode === LifecycleMode.ENABLED) {
        message.success(`Lifecycle "${name}" enabled.`);
      } else if (newMode === LifecycleMode.DRY_RUN) {
        message.success(`Lifecycle "${name}" set to dry run.`);
      } else if (newMode === LifecycleMode.DISABLED) {
        message.success(`Lifecycle "${name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        message.error(`Failed to change lifecycle mode: ${err.message}`);
      } else {
        message.error("Failed to change lifecycle mode.");
      }
    } finally {
      setChangingMode(null);
    }
  };

  const getLifecycles = async () => {
    try {
      setIsLoadingLifecycles(true);
      setLifecycles(await props.client.getLifecycleList());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLifecycles(false);
    }
  };

  const getBuckets = async () => {
    try {
      setBuckets(await props.client.getBucketList());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getLifecycles().then();
    const interval = setInterval(() => getLifecycles(), 5000);
    return () => clearInterval(interval);
  }, [creatingLifecycle]);

  useEffect(() => {
    getBuckets().then();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const data = lifecycles.map((lifecycle) => ({
    key: lifecycle.name,
    name: lifecycle.name,
    mode: lifecycle.mode,
    type: lifecycle.type,
    isRunning: lifecycle.isRunning,
    isProvisioned: lifecycle.isProvisioned,
  }));

  const provisionedNames = new Set(
    lifecycles.filter((l) => l.isProvisioned).map((l) => l.name),
  );
  const deletableKeys = selectedKeys.filter((k) => !provisionedNames.has(k));
  const provisionedSelectedCount = selectedKeys.length - deletableKeys.length;

  const columns: ColumnsType<LifecycleRow> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <span>{text}</span>
        // <Link to={`/lifecycles/${text}`}>
        //   <b>{text}</b>
        // </Link>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: LifecycleType) => (
        <Tag color={getLifecycleTypeColor(type)}>
          {getLifecycleTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: LifecycleRow) => {
        const { status, text, colorToken } = getLifecycleStatus(
          record.mode,
          record.isRunning,
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
      title: "Provisioned",
      key: "provisioned",
      render: (_: unknown, record: LifecycleRow) =>
        record.isProvisioned ? <Tag color="default">Provisioned</Tag> : null,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: LifecycleRow) => {
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
                setLifecycleToEdit(record.name);
                setIsSettingsModalOpen(true);
              }}
              tooltip="Settings"
              showTooltipWhenEnabled
            />
            {record.isProvisioned ? (
              <ActionIcon
                icon={<DeleteOutlined style={{ fontSize: "16px" }} />}
                disabled
                tooltip="Provisioned lifecycles cannot be removed"
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
                  setLifecycleToRemove(record.name);
                  setRemoveError(null);
                  setIsRemoveModalOpen(true);
                }}
                tooltip="Delete lifecycle"
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
        Lifecycles
        {props.permissions?.fullAccess ? (
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => setCreatingLifecycle(true)}
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
                    : "All selected lifecycles are provisioned"
                  : "Select lifecycles to delete"
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
                  : "Select lifecycles to change mode"
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
          title="Add a new lifecycle"
          centered
          open={creatingLifecycle}
          footer={null}
          destroyOnHidden
          onCancel={() => setCreatingLifecycle(false)}
        >
          <LifecycleSettingsForm
            client={props.client}
            onCreated={async () => {
              setCreatingLifecycle(false);
            }}
            sourceBuckets={buckets.map((bucket) => bucket.name)}
          />
        </Modal>
      </Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={isLoadingLifecycles}
        rowSelection={props.permissions?.fullAccess ? rowSelection : undefined}
      />
      <BulkRemoveConfirmationModal
        count={deletableKeys.length}
        resourceType="lifecycle"
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
            ? `${provisionedSelectedCount} provisioned lifecycle(s) will be skipped.`
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
      <Modal
        title="Settings"
        open={isSettingsModalOpen}
        footer={null}
        centered
        onCancel={() => setIsSettingsModalOpen(false)}
      >
        <LifecycleSettingsForm
          client={props.client}
          key={lifecycleToEdit}
          lifecycleName={lifecycleToEdit}
          readOnly={
            lifecycles.find((l) => l.name === lifecycleToEdit)?.isProvisioned
          }
          onCreated={() => {
            setIsSettingsModalOpen(false);
            getLifecycles();
          }}
          sourceBuckets={buckets.map((bucket) => bucket.name)}
        />
      </Modal>
      <RemoveConfirmationModal
        name={lifecycleToRemove}
        onRemove={onRemoveLifecycle}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        resourceType="lifecycle"
        open={isRemoveModalOpen}
        errorMessage={removeError}
      />
    </div>
  );
}
