import React, { useCallback, useEffect, useState } from "react";
import {
  APIError,
  BucketInfo,
  Client,
  Status,
  TokenPermissions,
} from "reduct-js";
import { Button, Flex, message, Modal, Tag, Tooltip, Typography } from "antd";
import type { TablePaginationConfig } from "antd";
// @ts-ignore
import prettierBytes from "prettier-bytes";

import "../../App.css";
import { getHistory } from "../../Components/Bucket/BucketCard";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import { Link } from "react-router-dom";
import {
  PlusOutlined,
  SettingOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import BucketSettingsForm from "../../Components/Bucket/BucketSettingsForm";
import ScrollableTable from "../../Components/ScrollableTable";
import ActionIcon from "../../Components/ActionIcon";
import { usePaginationStore } from "../../stores/paginationStore";
import { useSelectionMode } from "../../hooks/useSelectionMode";
import { useBulkDelete } from "../../hooks/useBulkDelete";
import BulkRemoveConfirmationModal from "../../Components/BulkRemoveConfirmationModal";
import "./BucketList.css";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

/**
 * Bucket View
 */
export default function BucketList(props: Readonly<Props>) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [bucketToRemove, setBucketToRemove] = useState<string>("");
  const [bucketToEdit, setBucketToEdit] = useState<string>("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const deletionTooltip = "Deletion in progress. Action disabled.";

  const paginationStorageKey = "bucket-list-pagination";
  const { setPageSize, getPageSize } = usePaginationStore();
  const pageSize = getPageSize(paginationStorageKey);

  const { selectedKeys, clearSelection, rowSelection } = useSelectionMode({
    getDisabledKeys: () =>
      buckets
        .filter((b) => b.isProvisioned || b.status === Status.DELETING)
        .map((b) => b.name),
  });

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(paginationStorageKey, newPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
    },
    [paginationStorageKey, setPageSize],
  );

  const handleTableChange = useCallback(
    (tablePagination: TablePaginationConfig) => {
      if (tablePagination.current) {
        setCurrentPage(tablePagination.current);
      }
      if (tablePagination.pageSize && tablePagination.pageSize !== pageSize) {
        handlePageSizeChange(tablePagination.pageSize);
      }
    },
    [handlePageSizeChange, pageSize],
  );

  const getBuckets = async () => {
    try {
      setIsLoading(true);
      const { client } = props;
      const bucketList: BucketInfo[] = await client.getBucketList();
      setBuckets(bucketList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const {
    handleBulkDelete,
    bulkDeleting,
    bulkProgress,
    bulkError,
    setBulkError,
  } = useBulkDelete({
    onDelete: async (name) => {
      const bucket = await props.client.getBucket(name);
      await bucket.remove();
    },
    onStart: (keys) => {
      setBuckets((prev) =>
        prev.map((b) =>
          keys.includes(b.name) ? { ...b, status: Status.DELETING } : b,
        ),
      );
    },
    onSuccess: () => {
      setIsBulkDeleteOpen(false);
      clearSelection();
      getBuckets();
    },
    onError: (failures) => {
      message.error(`${failures.length} bucket(s) failed to remove`);
    },
  });

  const removeBucket = async (name: string) => {
    setIsRemoveModalOpen(false);
    setBuckets((prevBuckets) =>
      prevBuckets.map((bucket) =>
        bucket.name === name ? { ...bucket, status: Status.DELETING } : bucket,
      ),
    );
    try {
      const { client } = props;
      const bucket = await client.getBucket(name);
      await bucket.remove();
      setBuckets((prevBuckets) =>
        prevBuckets.filter((bucket) => bucket.name !== name),
      );
    } catch (err) {
      console.error(err);
      const errorMsg =
        err instanceof APIError && err.message
          ? err.message
          : "Failed to remove bucket.";
      message.error(errorMsg);
    }
  };

  const handleOpenRemoveModal = (name: string) => {
    setBucketToRemove(name);
    setIsRemoveModalOpen(true);
  };

  const handleOpenSettingsModal = (bucketName: string) => {
    setBucketToEdit(bucketName);
    setIsSettingsModalOpen(true);
  };

  useEffect(() => {
    getBuckets();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, [creatingBucket]);

  const data = buckets.map((bucket) => {
    const printIsoDate = (timestamp: bigint) => {
      if (bucket.entryCount === 0n) return "—";
      const ms = Number(timestamp / 1000n);
      const date = new Date(ms);
      return isNaN(date.getTime()) ? "—" : date.toISOString();
    };
    return {
      name: bucket.name,
      provisioned: bucket.isProvisioned,
      actions: bucket.isProvisioned,
      entryCount: bucket.entryCount.toString(),
      size: prettierBytes(Number(bucket.size)),
      history: bucket.entryCount !== 0n ? getHistory(bucket) : "—",
      oldestRecord: printIsoDate(bucket.oldestRecord),
      latestRecord: printIsoDate(bucket.latestRecord),
      status: bucket.status,
    };
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left" as const,
      render: (
        name: string,
        record: { status?: Status; provisioned?: boolean },
      ) => {
        const isDeleting = record.status === Status.DELETING;
        return (
          <span>
            {isDeleting ? (
              <b style={{ color: "#bfbfbf" }}>{name}</b>
            ) : (
              <Link to={`/buckets/${name}`}>
                <b>{name}</b>
              </Link>
            )}
            {isDeleting ? (
              <Tag
                color="processing"
                icon={<LoadingOutlined spin />}
                style={{ marginLeft: 8 }}
              >
                Deleting
              </Tag>
            ) : null}
            {record.provisioned && !isDeleting ? (
              <Tag color="default" style={{ marginLeft: 8 }}>
                Provisioned
              </Tag>
            ) : null}
          </span>
        );
      },
    },

    { title: "Entries", dataIndex: "entryCount", key: "entryCount" },
    { title: "Size", dataIndex: "size", key: "size" },
    { title: "History", dataIndex: "history", key: "history" },
    {
      title: "Oldest Record (UTC)",
      dataIndex: "oldestRecord",
      key: "oldestRecord",
    },
    {
      title: "Latest Record (UTC)",
      dataIndex: "latestRecord",
      key: "latestRecord",
    },
    ...(props.permissions?.fullAccess
      ? [
          {
            title: "Actions",
            dataIndex: "actions",
            key: "actions",
            render: (
              provisioned: boolean,
              record: {
                name: string;
                provisioned: boolean | undefined;
                status?: Status;
              },
            ) => {
              const isDeleting = record.status === Status.DELETING;
              if (provisioned) {
                return (
                  <Flex gap="middle">
                    <ActionIcon
                      icon={<SettingOutlined style={{ fontSize: "16px" }} />}
                      onClick={() => handleOpenSettingsModal(record.name)}
                      tooltip="Settings"
                      showTooltipWhenEnabled
                    />
                    <ActionIcon
                      icon={<DeleteOutlined style={{ fontSize: "16px" }} />}
                      disabled
                      tooltip="Provisioned buckets cannot be removed"
                      showTooltipWhenEnabled
                    />
                  </Flex>
                );
              } else {
                return (
                  <Flex gap="middle">
                    {!record.provisioned && (
                      <ActionIcon
                        icon={<SettingOutlined style={{ fontSize: "16px" }} />}
                        onClick={() => handleOpenSettingsModal(record.name)}
                        disabled={isDeleting}
                        tooltip={isDeleting ? deletionTooltip : "Settings"}
                        showTooltipWhenEnabled
                      />
                    )}
                    <ActionIcon
                      icon={
                        <DeleteOutlined
                          style={{
                            fontSize: "16px",
                            color: isDeleting ? undefined : "#ff4d4f",
                          }}
                        />
                      }
                      onClick={() => handleOpenRemoveModal(record.name)}
                      disabled={isDeleting}
                      tooltip={isDeleting ? deletionTooltip : "Remove bucket"}
                      showTooltipWhenEnabled
                    />
                  </Flex>
                );
              }
            },
          },
        ]
      : []),
  ];

  return (
    <div className="bucketList">
      <Typography.Title level={3} className="bucketsTitle">
        Buckets
        {props.permissions?.fullAccess ? (
          <>
            <Tooltip title="Create bucket" placement="bottomLeft">
              <Button
                className="addButton"
                icon={<PlusOutlined />}
                onClick={() => setCreatingBucket(true)}
                aria-label="Add"
              />
            </Tooltip>
            <Tooltip
              title={
                selectedKeys.length > 0
                  ? `Delete ${selectedKeys.length} selected`
                  : "Select buckets to delete"
              }
              placement="bottomLeft"
            >
              <Button
                style={{ float: "right", marginRight: 8 }}
                icon={<DeleteOutlined />}
                onClick={() => setIsBulkDeleteOpen(true)}
                danger
                disabled={selectedKeys.length === 0}
              />
            </Tooltip>
          </>
        ) : null}
      </Typography.Title>
      <ScrollableTable
        scroll={{ x: "max-content" }}
        className="bucketsTable"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        rowKey="name"
        rowSelection={props.permissions?.fullAccess ? rowSelection : undefined}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
        onChange={handleTableChange}
      />

      {/* Modals */}
      <Modal
        title="Add a new bucket"
        open={creatingBucket}
        footer={null}
        onCancel={() => setCreatingBucket(false)}
      >
        <BucketSettingsForm
          client={props.client}
          onCreated={async () => {
            setCreatingBucket(false);
          }}
        />
      </Modal>
      <RemoveConfirmationModal
        name={bucketToRemove}
        onRemove={() => removeBucket(bucketToRemove)}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        resourceType="bucket"
        open={isRemoveModalOpen}
        errorMessage={removeError}
      />
      <Modal
        title="Settings"
        open={isSettingsModalOpen}
        footer={null}
        onCancel={() => setIsSettingsModalOpen(false)}
      >
        <BucketSettingsForm
          client={props.client}
          key={bucketToEdit}
          bucketName={bucketToEdit}
          readOnly={buckets.find((b) => b.name === bucketToEdit)?.isProvisioned}
          onCreated={() => {
            setIsSettingsModalOpen(false);
            getBuckets();
          }}
        />
      </Modal>
      <BulkRemoveConfirmationModal
        count={selectedKeys.length}
        resourceType="bucket"
        open={isBulkDeleteOpen}
        onConfirm={() => handleBulkDelete(selectedKeys)}
        onCancel={() => {
          setIsBulkDeleteOpen(false);
          setBulkError(null);
        }}
        loading={bulkDeleting}
        progress={bulkProgress ?? undefined}
        errorMessage={bulkError}
      />
    </div>
  );
}
