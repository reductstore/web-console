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
  EditOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import BucketSettingsForm from "../../Components/Bucket/BucketSettingsForm";
import RenameModal from "../../Components/RenameModal";
import ScrollableTable from "../../Components/ScrollableTable";
import { usePaginationStore } from "../../stores/paginationStore";
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
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [bucketToRemove, setBucketToRemove] = useState<string>("");
  const [bucketToRename, setBucketToRename] = useState<string>("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const deletionTooltip = "Deletion in progress. Action disabled.";
  const disabledActionStyle = { color: "#bfbfbf", cursor: "not-allowed" };

  const paginationStorageKey = "bucket-list-pagination";
  const { setPageSize, getPageSize } = usePaginationStore();
  const pageSize = getPageSize(paginationStorageKey);

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

  const renameBucket = async (name: string) => {
    if (name.trim() === "") {
      setRenameError("Name cannot be empty.");
      return;
    }
    try {
      const { client } = props;
      const bucket = await client.getBucket(bucketToRename);
      if (bucket.getName() === name) {
        setRenameError("The new name must be different from the current name.");
        return;
      }
      await bucket.rename(name);
      getBuckets();
      setRenameError(null);
      setIsRenameModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRenameError(err.message);
      else setRenameError("Failed to rename bucket.");
    }
  };

  const handleOpenRenameModal = (bucketName: string) => {
    setBucketToRename(bucketName);
    setIsRenameModalOpen(true);
  };

  useEffect(() => {
    getBuckets();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, [creatingBucket]);

  const data = buckets.map((bucket) => {
    const printIsoDate = (timestamp: bigint) =>
      bucket.entryCount !== 0n
        ? new Date(Number(timestamp / 1000n)).toISOString()
        : "---";
    return {
      name: bucket.name,
      provisioned: bucket.isProvisioned,
      entryCount: bucket.entryCount.toString(),
      size: prettierBytes(Number(bucket.size)),
      history: bucket.entryCount !== 0n ? getHistory(bucket) : "---",
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
      fixed: "left",
      render: (name: string, record: { status?: Status }) => {
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
    {
      title: "",
      dataIndex: "provisioned",
      key: "provisioned",
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
            <Tag key={`provisioned-${record.name}`} color="processing">
              Provisioned
            </Tag>
          );
        } else {
          return (
            <Flex gap="middle">
              {!record.provisioned && (
                <>
                  {isDeleting ? (
                    <Tooltip title={deletionTooltip}>
                      <span>
                        <EditOutlined
                          key={`rename-${record.name}`}
                          title="Rename"
                          style={disabledActionStyle}
                        />
                      </span>
                    </Tooltip>
                  ) : (
                    <EditOutlined
                      key={`rename-${record.name}`}
                      title="Rename"
                      onClick={() => handleOpenRenameModal(record.name)}
                    />
                  )}
                </>
              )}
              {isDeleting ? (
                <Tooltip title={deletionTooltip}>
                  <span>
                    <DeleteOutlined
                      key={`remove-${record.name}`}
                      title="Remove"
                      className="removeButton"
                      style={disabledActionStyle}
                    />
                  </span>
                </Tooltip>
              ) : (
                <DeleteOutlined
                  key={`remove-${record.name}`}
                  title="Remove"
                  className="removeButton"
                  onClick={() => handleOpenRemoveModal(record.name)}
                />
              )}
            </Flex>
          );
        }
      },
    },
  ];

  return (
    <div className="bucketList">
      <Typography.Title level={3} className="bucketsTitle">
        Buckets
        {props.permissions?.fullAccess ? (
          <Button
            className="addButton"
            icon={<PlusOutlined />}
            onClick={() => setCreatingBucket(true)}
            title="Add"
          />
        ) : null}
      </Typography.Title>
      <ScrollableTable
        scroll={{ x: "max-content" }}
        className="bucketsTable"
        columns={columns}
        dataSource={data}
        loading={isLoading}
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
      <RenameModal
        name={bucketToRename}
        onRename={(newName) => renameBucket(newName)}
        onCancel={() => {
          setIsRenameModalOpen(false);
          setRenameError(null);
        }}
        resourceType="bucket"
        open={isRenameModalOpen}
        errorMessage={renameError}
      />
    </div>
  );
}
