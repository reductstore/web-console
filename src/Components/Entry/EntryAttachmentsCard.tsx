import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input, Modal, Typography, message } from "antd";
import type { ColumnType } from "antd/es/table";
import {
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { APIError, Client } from "reduct-js";
import ScrollableTable from "../ScrollableTable";
import { naturalNameSort } from "../../Views/BucketPanel/tree";
import AttachmentEditor from "./AttachmentEditor";
import "./EntryAttachmentsCard.css";

interface EntryAttachmentsCardProps {
  client: Client;
  bucketName: string;
  entryName: string;
  editable: boolean;
}

interface AttachmentTableRow {
  key: string;
  name: string;
  content: string;
  rawValue: unknown;
}

interface EditingState {
  originalKey: string | null;
}

const formatAttachmentValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const truncateContent = (value: unknown, maxLen = 50): string => {
  const str = formatAttachmentValue(value);
  const oneLine = str.replace(/\n/g, " ").replace(/\s+/g, " ");
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 3) + "...";
};

const EntryAttachmentsCard: React.FC<EntryAttachmentsCardProps> = ({
  client,
  bucketName,
  entryName,
  editable,
}) => {
  const [attachments, setAttachments] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setIsLoading(true);
    try {
      const bucket = await client.getBucket(bucketName);
      const data = await bucket.readAttachments(entryName);
      setAttachments(data || {});
    } catch (err) {
      if (err instanceof APIError) {
        message.error(err.message || "Failed to load attachments.");
      } else {
        message.error("Failed to load attachments.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [bucketName, client, entryName]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const startAdd = () => {
    setEditing({ originalKey: null });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const clearRowError = (name: string) => {
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const saveRowEdit = async (
    originalName: string,
    key: string,
    value: string,
  ): Promise<boolean> => {
    const trimmedKey = key.trim();
    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: "Invalid JSON",
      }));
      return false;
    }
    if (originalName !== trimmedKey && trimmedKey in attachments) {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: `Name '${trimmedKey}' already exists.`,
      }));
      return false;
    }

    setIsSaving(true);

    try {
      const bucket = await client.getBucket(bucketName);
      const updated: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attachments)) {
        if (k === originalName) continue;
        updated[k] = v;
      }
      updated[trimmedKey] = parsedValue;

      if (originalName !== trimmedKey && originalName in attachments) {
        await bucket.removeAttachments(entryName, [originalName]);
      }

      await bucket.writeAttachments(entryName, updated);
      setAttachments(updated);
      setExpandedRowKeys((keys) => keys.filter((key) => key !== originalName));
      clearRowError(originalName);
      message.success("Attachment saved");
      await loadAttachments();
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof APIError
          ? err.message || "Failed to save attachment."
          : "Failed to save attachment.";
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: errorMsg,
      }));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAttachment = (name: string, value: unknown) => {
    const json = JSON.stringify(value, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const saveNewAttachment = async (
    key: string,
    value: string,
  ): Promise<boolean> => {
    const trimmedKey = key.trim();

    if (trimmedKey in attachments) {
      setAddError(`Name '${trimmedKey}' already exists.`);
      return false;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      setAddError("Invalid JSON");
      return false;
    }

    setIsSaving(true);

    try {
      const bucket = await client.getBucket(bucketName);
      const updated: Record<string, unknown> = { ...attachments };
      updated[trimmedKey] = parsedValue;

      await bucket.writeAttachments(entryName, updated);
      setAttachments(updated);
      setEditing(null);
      setAddError(null);
      message.success("Attachment saved");
      await loadAttachments();
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof APIError
          ? err.message || "Failed to save attachment."
          : "Failed to save attachment.";
      setAddError(errorMsg);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const removeAttachment = async (key: string) => {
    const bucket = await client.getBucket(bucketName);
    await bucket.removeAttachments(entryName, [key]);
    message.success("Attachment removed");
    const updated = { ...attachments };
    delete updated[key];
    setAttachments(updated);
    if (editing?.originalKey === key) {
      setEditing(null);
    }
    await loadAttachments();
  };

  const attachmentEntries = Object.entries(attachments);

  const tableData: AttachmentTableRow[] = attachmentEntries.map(
    ([name, value]) => ({
      key: name,
      name,
      content: truncateContent(value),
      rawValue: value,
    }),
  );

  const isAddingNew = editing !== null && editing.originalKey === null;

  const columns: ColumnType<AttachmentTableRow>[] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 200,
      sorter: (a, b) => naturalNameSort(a.name, b.name),
      showSorterTooltip: false,
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => (
        <div className="filterDropdown">
          <Input
            placeholder="Search key"
            value={selectedKeys[0]}
            onChange={(e) =>
              setSelectedKeys(e.target.value ? [e.target.value] : [])
            }
            onPressEnter={() => confirm()}
            className="filterInput"
          />
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            className="filterButton"
          >
            Search
          </Button>
          <Button
            onClick={() => clearFilters?.()}
            size="small"
            className="resetButton"
          >
            Reset
          </Button>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined className={`filterIcon${filtered ? " active" : ""}`} />
      ),
      onFilter: (value, record) =>
        record.name.toLowerCase().includes((value as string).toLowerCase()),
      render: (text: string) => {
        return (
          <Typography.Text strong style={{ fontSize: 13 }}>
            {text}
          </Typography.Text>
        );
      },
    },
    {
      title: "Content",
      dataIndex: "content",
      key: "content",
      render: (text: string) => {
        return (
          <Typography.Text type="secondary" className="contentPreview">
            {text}
          </Typography.Text>
        );
      },
    },
  ];

  columns.push({
    title: "Actions",
    key: "actions",
    width: editable ? 100 : 40,
    render: (_: unknown, row: AttachmentTableRow) => {
      return (
        <div className="rowActions">
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            title="Download"
            onClick={() => downloadAttachment(row.name, row.rawValue)}
            className="actionIcon"
          />
          {editable && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Delete attachment"
              className="actionIcon deleteIcon"
              onClick={() => {
                setDeleteKey(row.name);
                setDeleteError(null);
              }}
            />
          )}
        </div>
      );
    },
  });

  const hasAttachments = Object.keys(attachments).length > 0;

  return (
    <div className="entryAttachmentsSection">
      <Typography.Title level={3}>Attachments</Typography.Title>

      {editable && (
        <Button
          type="dashed"
          onClick={startAdd}
          icon={<UploadOutlined />}
          style={{ marginBottom: 12 }}
        >
          Add Attachment
        </Button>
      )}

      {!editable && !hasAttachments && (
        <Typography.Text type="secondary" style={{ display: "block" }}>
          No attachments
        </Typography.Text>
      )}

      <Modal
        title="Add Attachment"
        open={isAddingNew}
        onCancel={cancelEdit}
        footer={null}
        centered
        width={600}
        destroyOnHidden
      >
        <AttachmentEditor
          initialKey=""
          initialValue=""
          onSave={saveNewAttachment}
          onClose={cancelEdit}
          isSaving={isSaving}
          error={addError}
          onClearError={() => setAddError(null)}
        />
      </Modal>

      {hasAttachments && (
        <ScrollableTable
          scroll={{ x: "max-content" }}
          columns={columns}
          dataSource={tableData}
          size="small"
          loading={isLoading}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys: readonly React.Key[]) => {
              if (editing !== null) return;
              const newKeys = keys as string[];
              const removedKeys = expandedRowKeys.filter(
                (key) => !newKeys.includes(key),
              );
              for (const key of removedKeys) {
                clearRowError(key);
              }
              setExpandedRowKeys(newKeys);
            },
            expandedRowRender: (record: AttachmentTableRow) => {
              return (
                <AttachmentEditor
                  initialKey={record.name}
                  initialValue={formatAttachmentValue(record.rawValue)}
                  readOnly={!editable}
                  onSave={(key, value) => saveRowEdit(record.name, key, value)}
                  onClose={() => {
                    setExpandedRowKeys((keys) =>
                      keys.filter((key) => key !== record.name),
                    );
                    clearRowError(record.name);
                  }}
                  isSaving={isSaving}
                  error={rowErrors[record.name]}
                  onClearError={() => clearRowError(record.name)}
                  expandable
                  expandedTitle={`Attachment Editor: ${record.name}`}
                />
              );
            },
          }}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
          }}
        />
      )}

      <Modal
        title="Delete Attachment"
        open={deleteKey !== null}
        onCancel={() => {
          setDeleteKey(null);
          setDeleteError(null);
        }}
        centered
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setDeleteKey(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>,
          <Button
            key="delete"
            type="default"
            danger
            onClick={async () => {
              if (!deleteKey) return;
              try {
                await removeAttachment(deleteKey);
                setDeleteKey(null);
                setDeleteError(null);
              } catch (err) {
                console.error("Failed to delete attachment:", err);
                if (err instanceof APIError) {
                  setDeleteError(err.message || "Failed to delete attachment");
                } else if (err instanceof Error) {
                  setDeleteError(err.message);
                } else {
                  setDeleteError("Failed to delete attachment");
                }
              }
            }}
          >
            Delete
          </Button>,
        ]}
      >
        {deleteError && (
          <Alert
            type="error"
            title={deleteError}
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}
        <Typography.Paragraph>
          Are you sure you want to delete this attachment? This action cannot be
          undone.
        </Typography.Paragraph>
        {deleteKey && (
          <div>
            <Typography.Text strong>Key: </Typography.Text>
            <Typography.Text>{deleteKey}</Typography.Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EntryAttachmentsCard;
