import React, { useEffect, useState } from "react";
import { APIError, BucketInfo, Client, TokenPermissions } from "reduct-js";
import { Button, Flex, Modal, Table, Tag, Typography } from "antd";
// @ts-ignore
import prettierBytes from "prettier-bytes";

import "../../App.css";
import { getHistory } from "../../Components/Bucket/BucketCard";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import { Link } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import CreateOrUpdate from "../../Components/Bucket/CreateOrUpdate";
import RenameModal from "../../Components/RenameModal";

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
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [bucketToRemove, setBucketToRemove] = useState("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [bucketToRename, setBucketToRename] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);

  const getBuckets = async () => {
    try {
      const { client } = props;
      const bucketList: BucketInfo[] = await client.getBucketList();
      setBuckets(bucketList);
    } catch (err) {
      console.error(err);
    }
  };

  const removeBucket = async (name: string) => {
    try {
      const { client } = props;
      const bucket = await client.getBucket(name);
      await bucket.remove();
      setBuckets(buckets.filter((bucket) => bucket.name !== name));
    } catch (err) {
      console.error(err);
    }
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

  useEffect(() => {
    getBuckets();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, [creatingBucket]);

  const handleRemove = (bucketName: string) => {
    setBucketToRemove(bucketName);
    setConfirmRemove(true);
  };

  const handleOpenRenameModal = (bucketName: string) => {
    setBucketToRename(bucketName);
    setIsRenameModalOpen(true);
  };

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
      render: (name: string, record: { provisioned: boolean | undefined }) => (
        <Flex gap="small" key={`link-${name}`}>
          {!record.provisioned && (
            <EditOutlined
              key={`rename-${name}`}
              title="Rename"
              onClick={() => handleOpenRenameModal(name)}
            >
              Rename
            </EditOutlined>
          )}
          <Link to={`buckets/${name}`}>
            <b>{name}</b>
          </Link>
        </Flex>
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
      render: (provisioned: boolean, record: { name: string }) => {
        if (provisioned) {
          return (
            <Tag key={`provisioned-${record.name}`} color="processing">
              Provisioned
            </Tag>
          );
        } else {
          return (
            <DeleteOutlined
              key={`remove-${record.name}`}
              title="Remove"
              style={{ color: "red" }}
              onClick={() => handleRemove(record.name)}
            />
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
        <Modal
          title="Add a new bucket"
          open={creatingBucket}
          footer={null}
          onCancel={() => setCreatingBucket(false)}
        >
          <CreateOrUpdate
            client={props.client}
            onCreated={async () => {
              setCreatingBucket(false);
            }}
          />
        </Modal>
      </Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={buckets.length == 0}
      />
      <RemoveConfirmationModal
        name={bucketToRemove}
        onRemove={() => removeBucket(bucketToRemove)}
        onCancel={() => setConfirmRemove(false)}
        confirm={confirmRemove}
        resourceType="bucket"
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
