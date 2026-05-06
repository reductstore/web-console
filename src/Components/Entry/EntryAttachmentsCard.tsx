import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Modal, Typography, message } from "antd";
import type { ColumnType } from "antd/es/table";
import {
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { APIError, Client, AttachmentEntry } from "reduct-js";
import prettierBytes from "prettier-bytes";
import ScrollableTable from "../ScrollableTable";
import { naturalNameSort } from "../../Views/BucketPanel/tree";
import { getExtensionFromContentType } from "../../Helpers/contentType";
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
  rawValue: unknown;
  contentType: string;
  size: number;
  isBinary: boolean;
}

interface EditingState {
  originalKey: string | null;
}

const formatAttachmentValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const isJsonContentType = (contentType: string): boolean => {
  const ct = contentType.split(";")[0].trim().toLowerCase();
  return (
    ct === "application/json" || ct === "text/json" || ct.endsWith("+json")
  );
};

const EntryAttachmentsCard: React.FC<EntryAttachmentsCardProps> = ({
  client,
  bucketName,
  entryName,
  editable,
}) => {
  const [attachments, setAttachments] = useState<
    Record<string, AttachmentEntry>
  >({});
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
      const data = await bucket.readAttachmentsDetailed(entryName);
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
      await bucket.writeAttachments(entryName, { [trimmedKey]: parsedValue });

      if (originalName !== trimmedKey && originalName in attachments) {
        await bucket.removeAttachments(entryName, [originalName]);
      }
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

  const renameAttachment = async (
    originalName: string,
    newName: string,
    contentType: string,
  ): Promise<boolean> => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === originalName) return false;
    if (trimmedName in attachments) {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: `Name '${trimmedName}' already exists.`,
      }));
      return false;
    }

    setIsSaving(true);
    try {
      const bucket = await client.getBucket(bucketName);
      const entry = attachments[originalName];
      await bucket.writeAttachments(
        entryName,
        { [trimmedName]: entry.value },
        contentType,
      );
      await bucket.removeAttachments(entryName, [originalName]);
      setExpandedRowKeys((keys) => keys.filter((key) => key !== originalName));
      clearRowError(originalName);
      message.success("Attachment renamed");
      await loadAttachments();
      return true;
    } catch (err) {
      const errorMsg =
        err instanceof APIError
          ? err.message || "Failed to rename attachment."
          : "Failed to rename attachment.";
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: errorMsg,
      }));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAttachment = (name: string, row: AttachmentTableRow) => {
    const a = document.createElement("a");
    if (row.isBinary) {
      const binary = atob(row.rawValue as string);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: row.contentType });
      const url = URL.createObjectURL(blob);
      a.href = url;
      const ext = getExtensionFromContentType(row.contentType);
      a.download = name.includes(".") ? name : `${name}${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const json = JSON.stringify(row.rawValue, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
      await bucket.writeAttachments(entryName, { [trimmedKey]: parsedValue });
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
    if (editing?.originalKey === key) {
      setEditing(null);
    }
    await loadAttachments();
  };

  const attachmentEntries = Object.entries(attachments);

  const tableData: AttachmentTableRow[] = attachmentEntries.map(
    ([name, entry]) => {
      const isBinary = !isJsonContentType(entry.contentType);
      const size = isBinary
        ? Math.floor(((entry.value as string).length * 3) / 4)
        : new Blob([JSON.stringify(entry.value)]).size;
      return {
        key: name,
        name,
        rawValue: entry.value,
        contentType: entry.contentType,
        size,
        isBinary,
      };
    },
  );

  const isAddingNew = editing !== null && editing.originalKey === null;

  const columns: ColumnType<AttachmentTableRow>[] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => naturalNameSort(a.name, b.name),
      showSorterTooltip: false,
    },
    {
      title: "Size",
      dataIndex: "size",
      key: "size",
      sorter: (a, b) => a.size - b.size,
      showSorterTooltip: false,
      render: (_: number, row: AttachmentTableRow) => prettierBytes(row.size),
    },
    {
      title: "Content Type",
      dataIndex: "contentType",
      key: "contentType",
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
            onClick={() => downloadAttachment(row.name, row)}
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
          scroll={{ x: true }}
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
              if (record.isBinary) {
                return (
                  <AttachmentEditor
                    initialKey={record.name}
                    initialValue=""
                    readOnly={!editable}
                    binaryMode
                    onSave={(key) =>
                      renameAttachment(record.name, key, record.contentType)
                    }
                    onClose={() => {
                      setExpandedRowKeys((keys) =>
                        keys.filter((key) => key !== record.name),
                      );
                      clearRowError(record.name);
                    }}
                    isSaving={isSaving}
                    error={rowErrors[record.name]}
                    onClearError={() => clearRowError(record.name)}
                  />
                );
              }
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
