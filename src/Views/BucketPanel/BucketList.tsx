import React, { useEffect, useState } from "react";
import { APIError, BucketInfo, Client, TokenPermissions } from "reduct-js";
import { Button, Flex, Modal, Tag, Typography } from "antd";
// @ts-ignore
import prettierBytes from "prettier-bytes";

import "../../App.css";
import { getHistory } from "../../Components/Bucket/BucketCard";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import { Link } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import BucketSettingsForm from "../../Components/Bucket/BucketSettingsForm";
import RenameModal from "../../Components/RenameModal";
import ScrollableTable from "../../Components/ScrollableTable";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

/**
 * Bucket View
 */
export default function BucketList(props: Readonly<Props>) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [creatingBucket, setCreatingBucket] = useState(false);
  const [bucketToRemove, setBucketToRemove] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [bucketToRename, setBucketToRename] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      const { client } = props;
      const bucket = await client.getBucket(name);
      await bucket.remove();
      setBuckets(buckets.filter((bucket) => bucket.name !== name));
      setRemoveError(null);
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove bucket.");
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
    };
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      render: (name: string) => (
        <Link to={`/buckets/${name}`}>
          <b>{name}</b>
        </Link>
      ),
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
        record: { name: string; provisioned: boolean | undefined },
      ) => {
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
                <EditOutlined
                  key={`rename-${record.name}`}
                  title="Rename"
                  onClick={() => handleOpenRenameModal(record.name)}
                />
              )}
              <DeleteOutlined
                key={`remove-${record.name}`}
                title="Remove"
                style={{ color: "red" }}
                onClick={() => handleOpenRemoveModal(record.name)}
              />
            </Flex>
          );
        }
      },
    },
  ];

  return (
    <div style={{ margin: "2em" }}>
      <Typography.Title level={3}>
        Buckets
        {props.permissions?.fullAccess ? (
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => setCreatingBucket(true)}
            title="Add"
          />
        ) : null}
      </Typography.Title>
      <ScrollableTable
        scroll={{ x: "max-content" }}
        style={{ margin: "0.6em" }}
        columns={columns}
        dataSource={data}
        loading={isLoading}
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
