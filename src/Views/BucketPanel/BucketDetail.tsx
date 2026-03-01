import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bucket,
  BucketInfo,
  Client,
  TokenPermissions,
  APIError,
  Status,
} from "reduct-js";
import { useHistory, useParams } from "react-router-dom";
import BucketCard from "../../Components/Bucket/BucketCard";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import {
  Button,
  Divider,
  Flex,
  Input,
  Tooltip,
  Typography,
  message,
  Modal,
  Popover,
  Tree,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import {
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  ExpandAltOutlined,
  LineChartOutlined,
  NodeCollapseOutlined,
  NodeExpandOutlined,
  PartitionOutlined,
  ReloadOutlined,
  ShrinkOutlined,
} from "@ant-design/icons";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import RenameModal from "../../Components/RenameModal";
import UploadFileForm from "../../Components/Entry/UploadFileForm";
import { checkWritePermission } from "../../Helpers/permissionUtils";
import "./BucketDetail.css";
import BucketEntriesTable, {
  EntryTableRow,
} from "../../Components/Bucket/BucketEntriesTable";
import { buildEntryTree, EntryTreeNode, naturalNameSort } from "./tree";
import { getHistory } from "../../Components/Bucket/BucketCard";
import ActionIcon from "../../Components/ActionIcon";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

interface BucketEntryTableRow extends EntryTableRow {
  name: string;
  isLeaf: boolean;
  ownEntryName?: string;
  records: bigint;
  blocks: bigint;
  size: bigint;
  oldest?: bigint;
  latest?: bigint;
  history?: string;
  status?: Status;
}

const PAGE_SIZE_KEY = "bucketDetailPageSize";

const encodeEntryPath = (entry: string) =>
  entry
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const printTs = (timestamp?: bigint) => {
  if (timestamp === undefined) return "---";
  return new Date(Number(timestamp / 1_000n))
    .toISOString()
    .replace("T", " ")
    .substring(0, 19);
};

const collectLeafEntries = (
  rows: BucketEntryTableRow[],
): BucketEntryTableRow[] => {
  const leaves: BucketEntryTableRow[] = [];
  for (const row of rows) {
    if (row.ownEntryName) leaves.push(row);
    if (row.children?.length) {
      leaves.push(...collectLeafEntries(row.children as BucketEntryTableRow[]));
    }
  }
  return leaves;
};

function TreePopover({
  treeData,
  onSelect,
}: {
  treeData: any[];
  onSelect: (key: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={
        <Tree
          treeData={treeData}
          defaultExpandAll
          onSelect={(keys) => {
            if (keys.length > 0) {
              setOpen(false);
              onSelect(keys[0] as string);
            }
          }}
          style={{
            maxHeight: 300,
            overflow: "auto",
          }}
        />
      }
    >
      <PartitionOutlined
        style={{
          cursor: "pointer",
          marginLeft: 6,
          fontSize: 14,
          color: "#8c8c8c",
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </Popover>
  );
}

export default function BucketDetail(props: Readonly<Props>) {
  const { name } = useParams() as { name: string };
  const history = useHistory();

  const [info, setInfo] = useState<BucketInfo>();
  const [entries, setEntries] = useState<any[]>([]);
  const [entryToRemove, setEntryToRemove] = useState<string>("");
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [entryToRename, setEntryToRename] = useState<string>("");
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [pathQuery, setPathQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const value = localStorage.getItem(PAGE_SIZE_KEY);
    return value ? Number(value) : 20;
  });
  const [showAggregated, setShowAggregated] = useState(true);
  const [expandedOpenCount, setExpandedOpenCount] = useState(0);
  const [expandedTotalCount, setExpandedTotalCount] = useState(0);
  const [expandCollapseSignal, setExpandCollapseSignal] = useState<
    number | undefined
  >(undefined);
  const [expandCollapseTarget, setExpandCollapseTarget] = useState<
    "expand" | "collapse"
  >("collapse");

  const deletionTooltip = "Deletion in progress. Action disabled.";

  const getEntries = async () => {
    setIsLoading(true);
    try {
      const bucket: Bucket = await props.client.getBucket(name);
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
      const bucketName = info?.name;
      if (!bucketName) {
        setRenameError("No bucket info");
        return;
      }
      const bucket: Bucket = await props.client.getBucket(bucketName);
      await bucket.renameEntry(entryToRename, newName);
      await getEntries();
      setRenameError(null);
      setIsRenameModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) setRenameError(err.message);
      else setRenameError("Failed to rename entry.");
    }
  };

  const removeEntry = async (entryName: string) => {
    if (!info) return;

    setIsRemoveModalOpen(false);
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.name === entryName
          ? { ...entry, status: Status.DELETING }
          : entry,
      ),
    );

    try {
      const bucket: Bucket = await props.client.getBucket(info.name);
      await bucket.removeEntry(entryName);
      setEntryToRemove("");
      setEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.name !== entryName),
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

  const handleOpenEntry = useCallback(
    (entryName: string) => {
      history.push(`/buckets/${name}/entries/${encodeEntryPath(entryName)}`);
    },
    [history, name],
  );

  const hasWritePermission = info
    ? checkWritePermission(props.permissions, info.name)
    : false;

  useEffect(() => {
    getEntries().then();
  }, [name]);

  useEffect(() => {
    const hasDeletingEntries = entries.some(
      (entry) => entry.status === Status.DELETING,
    );
    if (!hasDeletingEntries) return;

    const interval = setInterval(() => getEntries(), 2000);
    return () => clearInterval(interval);
  }, [entries]);

  const handleExpandCollapseAll = () => {
    const shouldCollapse = expandedOpenCount > 0;
    setExpandCollapseTarget(shouldCollapse ? "collapse" : "expand");
    setExpandCollapseSignal((n) => (n ?? 0) + 1);
  };

  const tree = useMemo(() => buildEntryTree(entries), [entries]);

  const rows = useMemo<BucketEntryTableRow[]>(() => {
    const makeRow = (node: EntryTreeNode): BucketEntryTableRow => {
      const children = node.children.map(makeRow);
      const isLeaf = children.length === 0;
      const useOwnOnly = !showAggregated && !isLeaf && node.ownEntry;
      const stats = useOwnOnly
        ? {
            records: node.ownEntry!.recordCount ?? 0n,
            blocks: node.ownEntry!.blockCount ?? 0n,
            size: node.ownEntry!.size ?? 0n,
            oldest:
              (node.ownEntry!.recordCount ?? 0n) > 0n
                ? node.ownEntry!.oldestRecord
                : undefined,
            latest:
              (node.ownEntry!.recordCount ?? 0n) > 0n
                ? node.ownEntry!.latestRecord
                : undefined,
          }
        : node.stats;
      const showDashes = !showAggregated && !isLeaf && !node.ownEntry;
      const hasRecords = stats.records > 0n;

      return {
        key: node.key,
        fullName: node.fullName,
        name: node.segment,
        isLeaf,
        ownEntryName: node.ownEntry?.name,
        status: node.ownEntry?.status,
        records: showDashes ? 0n : stats.records,
        blocks: showDashes ? 0n : stats.blocks,
        size: showDashes ? 0n : stats.size,
        oldest: showDashes ? undefined : stats.oldest,
        latest: showDashes ? undefined : stats.latest,
        history: showDashes
          ? "---"
          : hasRecords &&
              stats.oldest !== undefined &&
              stats.latest !== undefined
            ? getHistory({
                oldestRecord: stats.oldest,
                latestRecord: stats.latest,
              })
            : "---",
        children,
      };
    };

    return tree.map(makeRow);
  }, [tree, showAggregated]);

  const columns = useMemo<ColumnsType<BucketEntryTableRow>>(
    () => [
      {
        title: "Entry",
        dataIndex: "name",
        key: "name",
        fixed: "left",
        render: (_: unknown, row) => {
          const isDeleting = row.status === Status.DELETING;
          const canOpen = Boolean(row.ownEntryName) && !isDeleting;
          const icon = row.isLeaf ? (
            <LineChartOutlined style={{ marginRight: 6, color: "#8c8c8c" }} />
          ) : (
            <DatabaseOutlined style={{ marginRight: 6, color: "#8c8c8c" }} />
          );

          return (
            <Flex align="center" gap={4}>
              {icon}
              {canOpen ? (
                <Typography.Link
                  onClick={() => handleOpenEntry(row.ownEntryName!)}
                >
                  {row.name}
                </Typography.Link>
              ) : (
                <Typography.Text>{row.name}</Typography.Text>
              )}
              {!row.ownEntryName &&
                row.children &&
                (row.children as BucketEntryTableRow[]).length > 0 &&
                (() => {
                  const leafChildren = collectLeafEntries(
                    row.children as BucketEntryTableRow[],
                  );
                  if (leafChildren.length >= 1) {
                    const treeData = (function buildTreeData(
                      nodes: BucketEntryTableRow[],
                    ): any[] {
                      return nodes
                        .filter(
                          (n) =>
                            n.ownEntryName ||
                            (n.children &&
                              (n.children as BucketEntryTableRow[]).length > 0),
                        )
                        .map((n) => ({
                          title: n.name,
                          key: n.fullName,
                          isLeaf: n.isLeaf,
                          selectable: Boolean(n.ownEntryName),
                          children: n.children?.length
                            ? buildTreeData(n.children as BucketEntryTableRow[])
                            : undefined,
                        }));
                    })(row.children as BucketEntryTableRow[]);

                    return (
                      <TreePopover
                        treeData={treeData}
                        onSelect={handleOpenEntry}
                      />
                    );
                  }
                  return null;
                })()}
            </Flex>
          );
        },
      },
      {
        title: "Records",
        dataIndex: "records",
        key: "records",
        align: "left",
        render: (v: bigint) => v.toString(),
      },
      {
        title: "Blocks",
        dataIndex: "blocks",
        key: "blocks",
        align: "left",
        render: (v: bigint) => v.toString(),
      },
      {
        title: "Size",
        dataIndex: "size",
        key: "size",
        align: "left",
        render: (v: bigint) => prettierBytes(Number(v)),
      },
      { title: "History", dataIndex: "history", key: "history", align: "left" },
      {
        title: "Oldest",
        dataIndex: "oldest",
        key: "oldest",
        align: "left",
        render: (v?: bigint) => printTs(v),
      },
      {
        title: "Latest",
        dataIndex: "latest",
        key: "latest",
        align: "left",
        render: (v?: bigint) => printTs(v),
      },
      ...(hasWritePermission
        ? [
            {
              title: "",
              key: "actions",
              width: 80,
              render: (_: unknown, row: BucketEntryTableRow) => {
                if (!row.ownEntryName) return null;
                const isDeleting = row.status === Status.DELETING;
                return (
                  <Flex gap="middle" onClick={(e) => e.stopPropagation()}>
                    <ActionIcon
                      icon={<EditOutlined title="Rename entry" />}
                      disabled={isDeleting}
                      tooltip={isDeleting ? deletionTooltip : "Rename entry"}
                      showTooltipWhenEnabled
                      onClick={() => {
                        setEntryToRename(row.ownEntryName!);
                        setIsRenameModalOpen(true);
                      }}
                    />
                    <ActionIcon
                      icon={
                        <DeleteOutlined
                          title="Remove entry"
                          className="removeButton"
                          style={{ color: "red" }}
                        />
                      }
                      disabled={isDeleting}
                      tooltip={isDeleting ? deletionTooltip : "Remove entry"}
                      showTooltipWhenEnabled
                      onClick={() => {
                        setEntryToRemove(row.ownEntryName!);
                        setIsRemoveModalOpen(true);
                      }}
                    />
                  </Flex>
                );
              },
            } as any,
          ]
        : []),
    ],
    [handleOpenEntry, hasWritePermission],
  );

  const sortedRows = useMemo(() => {
    const sortRows = (nodes: BucketEntryTableRow[]): BucketEntryTableRow[] =>
      [...nodes]
        .sort((a, b) => naturalNameSort(a.name, b.name))
        .map((node) => ({
          ...node,
          children: node.children?.length
            ? sortRows(node.children as BucketEntryTableRow[])
            : undefined,
        }));

    return sortRows(rows);
  }, [rows]);

  const handleTableChange = (tablePagination: TablePaginationConfig) => {
    const nextSize = tablePagination.pageSize ?? pageSize;
    const nextCurrent = tablePagination.current ?? currentPage;
    if (nextSize !== pageSize) {
      localStorage.setItem(PAGE_SIZE_KEY, String(nextSize));
      setPageSize(nextSize);
      setCurrentPage(1);
      return;
    }
    setCurrentPage(nextCurrent);
  };

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
          loading={isLoading}
        />
      ) : (
        <BucketCard
          bucketInfo={
            {
              name,
              entryCount: 0n,
              size: 0n,
              oldestRecord: 0n,
              latestRecord: 0n,
            } as BucketInfo
          }
          index={0}
          {...props}
          showPanel
          onRemoved={() => null}
          onShow={() => null}
          hasWritePermission={false}
          loading
        />
      )}

      <Divider />

      <Flex className="entriesHeader" justify="space-between" align="center">
        <Typography.Title level={3} className="entriesTitle">
          Entries
        </Typography.Title>
        <div className="entriesHeaderControls">
          <Input.Search
            allowClear
            className="entriesPathSearch"
            placeholder="Search by full path"
            value={pathInput}
            onChange={(e) => {
              setPathInput(e.target.value);
              if (e.target.value === "") {
                setPathQuery("");
                setCurrentPage(1);
              }
            }}
            onSearch={(value) => {
              setPathQuery(value);
              setCurrentPage(1);
            }}
          />
          <Tooltip
            title={
              expandedOpenCount > 0
                ? `Collapse all (${expandedOpenCount}/${expandedTotalCount})`
                : `Expand all (${expandedTotalCount})`
            }
            placement="bottomLeft"
          >
            <Button
              icon={
                expandedOpenCount > 0 ? (
                  <ShrinkOutlined />
                ) : (
                  <ExpandAltOutlined />
                )
              }
              onClick={handleExpandCollapseAll}
            />
          </Tooltip>
          <Tooltip
            title={showAggregated ? "Entry Stats" : "Entry + Sub-entry Stats"}
            placement="bottomLeft"
          >
            <Button
              icon={
                showAggregated ? (
                  <NodeCollapseOutlined />
                ) : (
                  <NodeExpandOutlined />
                )
              }
              onClick={() => {
                window.requestAnimationFrame(() => {
                  setShowAggregated((prev) => !prev);
                });
              }}
            />
          </Tooltip>
          <Tooltip title="Refresh entries" placement="bottomLeft">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => getEntries()}
              loading={isLoading}
            />
          </Tooltip>
        </div>
      </Flex>

      <BucketEntriesTable
        rows={sortedRows}
        columns={columns}
        loading={isLoading}
        pathQuery={pathQuery}
        currentPage={currentPage}
        pageSize={pageSize}
        onTableChange={handleTableChange}
        expandCollapseSignal={expandCollapseSignal}
        expandCollapseTarget={expandCollapseTarget}
        onExpandedStatsChange={(open, total) => {
          setExpandedOpenCount(open);
          setExpandedTotalCount(total);
        }}
      />

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
          onUploadSuccess={() => {
            setIsUploadModalVisible(false);
            getEntries();
          }}
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
