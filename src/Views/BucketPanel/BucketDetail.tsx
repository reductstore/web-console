import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button, Flex, Input, Typography, Modal, Divider } from "antd";
import type { TablePaginationConfig } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import RenameModal from "../../Components/RenameModal";
import UploadFileForm from "../../Components/Entry/UploadFileForm";
import ScrollableTable from "../../Components/ScrollableTable";
import { usePaginationStore } from "../../stores/paginationStore";
import "./BucketDetail.css";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const paginationStorageKey = `bucket-${name}-entries-pagination`;
  const { setPageSize, getPageSize } = usePaginationStore();
  const pageSize = getPageSize(paginationStorageKey);

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(paginationStorageKey, newPageSize);
      setCurrentPage(1);
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
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [entries, searchTerm],
  );

  const data = filteredEntries.map((entry) => {
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
                className="removeButton"
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
    <div className="bucketDetail">
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
      <Divider />
      <Flex justify="space-between" align="center" className="entriesHeader">
        <Typography.Title level={3} className="entriesTitle">
          Entries
        </Typography.Title>
        <Flex gap="small" align="center">
          <Input
            allowClear
            placeholder="Search entries"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="searchInput"
            aria-label="Search entries"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => getEntries()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Flex>
      </Flex>

      <ScrollableTable
        scroll={{ x: "max-content" }}
        className="entriesTable"
        columns={columns as any[]}
        dataSource={data}
        loading={isLoading}
        rowKey="name"
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
