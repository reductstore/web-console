import React, { useCallback, useEffect, useState } from "react";
import {
  Bucket,
  BucketInfo,
  EntryInfo,
  Client,
  TokenPermissions,
  APIError,
  Status,
} from "reduct-js";
import { useHistory, useParams, Link } from "react-router-dom";
import BucketCard, { getHistory } from "../../Components/Bucket/BucketCard";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {
  Button,
  Flex,
  Input,
  Typography,
  message,
  Modal,
  Divider,
  Space,
  Tag,
  Tooltip,
} from "antd";
import type { TablePaginationConfig } from "antd";
import type { ColumnsType, FilterConfirmProps } from "antd/es/table/interface";
import {
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  SearchOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import RenameModal from "../../Components/RenameModal";
import UploadFileForm from "../../Components/Entry/UploadFileForm";
import ScrollableTable from "../../Components/ScrollableTable";
import { usePaginationStore } from "../../stores/paginationStore";
import { checkWritePermission } from "../../Helpers/permissionUtils";
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
  const [currentPage, setCurrentPage] = useState(1);

  const deletionTooltip = "Deletion in progress. Action disabled.";
  const disabledActionStyle = { color: "#bfbfbf", cursor: "not-allowed" };

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
      message.error("No bucket info");
      return;
    }

    setIsRemoveModalOpen(false);
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.name === name ? { ...entry, status: Status.DELETING } : entry,
      ),
    );
    try {
      const { client } = props;
      const bucket: Bucket = await client.getBucket(info.name);
      await bucket.removeEntry(name);
      setEntryToRemove("");
      setEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.name !== name),
      );
    } catch (err) {
      console.error(err);
      const errorMsg =
        err instanceof APIError && err.message
          ? err.message
          : "Failed to remove entry.";
      message.error(errorMsg);
    }
  };

  const handleOpenRemoveModal = (entryName: string) => {
    setEntryToRemove(entryName);
    setIsRemoveModalOpen(true);
  };

  const hasWritePermission = info
    ? checkWritePermission(props.permissions, info.name)
    : false;

  const handleUploadSuccess = () => {
    setIsUploadModalVisible(false);
    getEntries();
  };

  useEffect(() => {
    getEntries().then();
  }, [name]);

  // Poll only when there are entries being deleted
  useEffect(() => {
    const hasDeletingEntries = entries.some(
      (entry) => entry.status === Status.DELETING,
    );
    if (!hasDeletingEntries) return;

    const interval = setInterval(() => getEntries(), 2000);
    return () => clearInterval(interval);
  }, [entries]);

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
      status: entry.status,
    };
  });

  const getColumnSearchProps = (dataIndex: string, placeholder: string) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }: {
      setSelectedKeys: (keys: React.Key[]) => void;
      selectedKeys: React.Key[];
      confirm: (param?: FilterConfirmProps) => void;
      clearFilters?: () => void;
    }) => (
      <div className="filterDropdown" onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Search ${placeholder}`}
          value={selectedKeys[0]}
          onChange={(e) =>
            setSelectedKeys(e.target.value ? [e.target.value] : [])
          }
          onPressEnter={() => {
            requestAnimationFrame(() => {
              confirm();
            });
          }}
          className="filterDropdownInput"
        />
        <Space className="filterDropdownSpace">
          <Button
            type="primary"
            onClick={() => {
              requestAnimationFrame(() => {
                confirm();
              });
            }}
            icon={<SearchOutlined />}
            size="small"
            className="filterDropdownButton"
          >
            Search
          </Button>
          <Button
            onClick={() => {
              requestAnimationFrame(() => {
                clearFilters && clearFilters();
                confirm();
              });
            }}
            size="small"
            className="filterDropdownButton"
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined
        className={filtered ? "filterIconActive" : "filterIcon"}
      />
    ),
    onFilter: (value: string | number | boolean, record: any) =>
      record[dataIndex]
        ?.toString()
        ?.toLowerCase()
        ?.includes((value as string).toLowerCase()),
  });

  const columns: ColumnsType<any> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 200,
      ...getColumnSearchProps("name", "entry names"),
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (name: string, record: { status?: Status }) => {
        const isDeleting = record.status === Status.DELETING;
        return (
          <span>
            {isDeleting ? (
              <b style={{ color: "#bfbfbf" }}>{name}</b>
            ) : (
              <Link to={`/buckets/${info?.name}/entries/${name}`}>
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
    {
      title: "Records",
      dataIndex: "recordCount",
      key: "recordCount",
      sorter: (a: any, b: any) =>
        parseInt(a.recordCount) - parseInt(b.recordCount),
    },
    {
      title: "Blocks",
      dataIndex: "blockCount",
      key: "blockCount",
      sorter: (a: any, b: any) =>
        parseInt(a.blockCount) - parseInt(b.blockCount),
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      sorter: (a: any, b: any) => {
        const getSizeInBytes = (sizeStr: string) => {
          if (sizeStr === "0 B") return 0;
          const units = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 };
          const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/);
          if (!match) return 0;
          const [, num, unit] = match;
          return parseFloat(num) * (units[unit as keyof typeof units] || 1);
        };

        return getSizeInBytes(a.size) - getSizeInBytes(b.size);
      },
    },
    {
      title: "History",
      dataIndex: "history",
      key: "history",
      sorter: (a: any, b: any) => {
        if (a.history === "---" && b.history === "---") return 0;
        if (a.history === "---") return 1;
        if (b.history === "---") return -1;

        const getHistoryMinutes = (historyStr: string) => {
          if (historyStr === "---") return 0;
          let totalMinutes = 0;

          const daysMatch = historyStr.match(/(\d+)\s*days?/);
          const hoursMatch = historyStr.match(/(\d+)\s*hours?/);
          const minutesMatch = historyStr.match(/(\d+)\s*minutes?/);
          const secondsMatch = historyStr.match(/(\d+)\s*seconds?/);

          if (daysMatch) totalMinutes += parseInt(daysMatch[1]) * 24 * 60;
          if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
          if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
          if (secondsMatch) totalMinutes += parseInt(secondsMatch[1]) / 60;

          return totalMinutes;
        };

        return getHistoryMinutes(a.history) - getHistoryMinutes(b.history);
      },
    },
    {
      title: "Oldest Record (UTC)",
      dataIndex: "oldestRecord",
      key: "oldestRecord",
      sorter: (a: any, b: any) => {
        if (a.oldestRecord === "---" && b.oldestRecord === "---") return 0;
        if (a.oldestRecord === "---") return 1;
        if (b.oldestRecord === "---") return -1;
        return (
          new Date(a.oldestRecord).getTime() -
          new Date(b.oldestRecord).getTime()
        );
      },
    },
    {
      title: "Latest Record (UTC)",
      dataIndex: "latestRecord",
      key: "latestRecord",
      sorter: (a: any, b: any) => {
        if (a.latestRecord === "---" && b.latestRecord === "---") return 0;
        if (a.latestRecord === "---") return 1;
        if (b.latestRecord === "---") return -1;
        return (
          new Date(a.latestRecord).getTime() -
          new Date(b.latestRecord).getTime()
        );
      },
    },
    {
      title: "",
      render: (_: any, entry: { name: string; status?: Status }) => {
        if (info && checkWritePermission(props.permissions, info.name)) {
          const isDeleting = entry.status === Status.DELETING;
          return (
            <Flex gap="middle">
              {isDeleting ? (
                <Tooltip title={deletionTooltip}>
                  <span>
                    <EditOutlined
                      key={`rename-${entry.name}`}
                      title="Rename entry"
                      style={disabledActionStyle}
                    />
                  </span>
                </Tooltip>
              ) : (
                <EditOutlined
                  key={`rename-${entry.name}`}
                  title="Rename entry"
                  onClick={() => handleOpenRenameModal(entry.name)}
                />
              )}
              {isDeleting ? (
                <Tooltip title={deletionTooltip}>
                  <span>
                    <DeleteOutlined
                      key={entry.name}
                      className="removeButton"
                      title="Remove entry"
                      style={disabledActionStyle}
                    />
                  </span>
                </Tooltip>
              ) : (
                <DeleteOutlined
                  key={entry.name}
                  className="removeButton"
                  title="Remove entry"
                  onClick={() => handleOpenRemoveModal(entry.name)}
                />
              )}
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
          onRemoved={() => {
            if (history.location.pathname === `/buckets/${name}`) {
              history.goBack();
            }
          }}
          onShow={() => null}
          onUpload={() => setIsUploadModalVisible(true)}
          hasWritePermission={hasWritePermission}
        />
      ) : (
        <div />
      )}
      <Divider />
      <Flex className="entriesHeader">
        <Typography.Title level={3} className="entriesTitle">
          Entries
        </Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => getEntries()}
          loading={isLoading}
        />
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
