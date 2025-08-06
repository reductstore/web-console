import React, { useEffect, useState } from "react";
import {
  Bucket,
  BucketInfo,
  EntryInfo,
  Client,
  TokenPermissions,
  APIError,
} from "reduct-js";
import { useHistory, useParams, Link } from "react-router-dom";
import BucketCard, { getHistory } from "../../Components/Bucket/BucketCard";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { Flex, Typography, Modal } from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import RenameModal from "../../Components/RenameModal";
import UploadFileForm from "../../Components/Entry/UploadFileForm";
import ScrollableTable from "../../Components/ScrollableTable";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

export default function BucketDetail(props: Readonly<Props>) {
  const { name } = useParams() as { name: string };
  const history = useHistory();

  const [info, setInfo] = useState<BucketInfo>();
  const [entries, setEntries] = useState<EntryInfo[]>([]);
  const [entryToRemove, setEntryToRemove] = useState<string>("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [entryToRename, setEntryToRename] = useState<string>("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  const getEntries = async () => {
    setIsLoading(true);
    try {
      const { client } = props;
      const bucket: Bucket = await client.getBucket(name);
      setInfo(await bucket.getInfo());
      setEntries(await bucket.getEntryList());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renameEntry = async (newName: string) => {
    if (newName.trim() === "") {
      setRenameError("Name cannot be empty.");
      return;
    }
    if (newName === entryToRename) {
      setRenameError("New name is the same as the old name.");
      return;
    }
    try {
      const { client } = props;
      const bucketName = info?.name;
      if (!bucketName) {
        setRenameError("No bucket info");
        return;
      }
      const bucket: Bucket = await client.getBucket(bucketName);
      await bucket.renameEntry(entryToRename, newName);
      getEntries();
      setRenameError(null);
      setIsRenameModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRenameError(err.message);
      else setRenameError("Failed to rename entry.");
    }
  };

  const handleOpenRenameModal = (entryName: string) => {
    setEntryToRename(entryName);
    setIsRenameModalOpen(true);
  };

  const removeEntry = async (name: string) => {
    if (!info) {
      setRemoveError("No bucket info");
      return;
    }

    try {
      const { client } = props;
      const bucket: Bucket = await client.getBucket(info.name);
      await bucket.removeEntry(name);
      setEntryToRemove("");
      getEntries().then();
      setRemoveError(null);
      setIsRemoveModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRemoveError(err.message);
      else setRemoveError("Failed to remove entry.");
    }
  };

  const handleOpenRemoveModal = (entryName: string) => {
    setEntryToRemove(entryName);
    setIsRemoveModalOpen(true);
  };

  const hasWritePermission =
    props.permissions?.fullAccess ||
    (props.permissions?.write &&
      info &&
      props.permissions.write.includes(info.name));

  const handleUploadSuccess = () => {
    setIsUploadModalVisible(false);
    getEntries();
  };

  useEffect(() => {
    getEntries().then();
  }, [name]);

  useEffect(() => {
    getEntries().then();
    const interval = setInterval(() => getEntries(), 5000);
    return () => clearInterval(interval);
  }, []);

  const data = entries.map((entry) => {
    const printIsoDate = (timestamp: bigint) =>
      entry.recordCount !== 0n
        ? new Date(Number(timestamp / 1000n)).toISOString()
        : "---";
    return {
      name: entry.name,
      recordCount: entry.recordCount.toString(),
      blockCount: entry.blockCount.toString(),
      size: prettierBytes(Number(entry.size)),
      history: entry.recordCount !== 0n ? getHistory(entry) : "---",
      oldestRecord: printIsoDate(entry.oldestRecord),
      latestRecord: printIsoDate(entry.latestRecord),
    };
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      render: (name: string) => (
        <Link to={`/buckets/${info?.name}/entries/${name}`}>
          <b>{name}</b>
        </Link>
      ),
    },
    { title: "Records", dataIndex: "recordCount", key: "recordCount" },
    { title: "Blocks", dataIndex: "blockCount", key: "blockCount" },
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
      render: (_: any, entry: { name: string }) => {
        if (
          props.permissions?.fullAccess ||
          (props.permissions?.write &&
            info &&
            props.permissions?.write?.indexOf(info?.name) !== -1)
        ) {
          return (
            <Flex gap="middle">
              <EditOutlined
                key={`rename-${entry.name}`}
                title="Rename entry"
                onClick={() => handleOpenRenameModal(entry.name)}
              />
              <DeleteOutlined
                key={entry.name}
                style={{ color: "red" }}
                title="Remove entry"
                onClick={() => handleOpenRemoveModal(entry.name)}
              />
            </Flex>
          );
        }
        return <div />;
      },
    },
  ];

  return (
    <div style={{ margin: "1.4em" }}>
      {info ? (
        <BucketCard
          bucketInfo={info}
          index={0}
          {...props}
          showPanel
          onRemoved={() => history.push("/buckets")}
          onShow={() => null}
          onUpload={() => setIsUploadModalVisible(true)}
          hasWritePermission={hasWritePermission}
        />
      ) : (
        <div />
      )}

      <Typography.Title level={3}>Entries</Typography.Title>

      <ScrollableTable
        scroll={{ x: "max-content" }}
        style={{ margin: "0.6em" }}
        columns={columns as any[]}
        dataSource={data}
        loading={isLoading}
      />

      {/* Modals */}
      <Modal
        title="Upload File"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <UploadFileForm
          client={props.client}
          bucketName={name}
          entryName=""
          availableEntries={entries.map((entry) => entry.name)}
          onUploadSuccess={handleUploadSuccess}
        />
      </Modal>
      <RemoveConfirmationModal
        key={entryToRemove}
        name={entryToRemove}
        onRemove={() => removeEntry(entryToRemove)}
        onCancel={() => {
          setRemoveError(null);
          setIsRemoveModalOpen(false);
        }}
        resourceType="entry"
        open={isRemoveModalOpen}
        errorMessage={removeError}
      />
      <RenameModal
        name={entryToRename}
        onRename={(newName) => renameEntry(newName)}
        onCancel={() => {
          setIsRenameModalOpen(false);
          setRenameError(null);
        }}
        resourceType="entry"
        open={isRenameModalOpen}
        errorMessage={renameError}
      />
    </div>
  );
}
