import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Input, Modal, Typography, message } from "antd";
import type { ColumnType } from "antd/es/table";
import Editor from "@monaco-editor/react";
import {
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
  DownloadOutlined,
  CopyOutlined,
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
  key: string;
  value: string;
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

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

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
  const [editValues, setEditValues] = useState<
    Record<string, { key: string; value: string }>
  >({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [addError, setAddError] = useState<string | null>(null);
  const [rowDragOver, setRowDragOver] = useState<string | null>(null);

  const validateJson = (value: string): string | null => {
    try {
      JSON.parse(value);
      return null;
    } catch (e) {
      if (e instanceof SyntaxError) {
        return e.message;
      }
      return "Invalid JSON";
    }
  };

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

  const startEdit = (name: string, rawValue: unknown) => {
    setEditValues((prev) => ({
      ...prev,
      [name]: { key: name, value: formatAttachmentValue(rawValue) },
    }));
    setExpandedRowKeys([name]);
  };

  const startAdd = () => {
    setEditing({ originalKey: null, key: "", value: "" });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleExpandRow = (name: string, rawValue: unknown) => {
    setEditValues((prev) => ({
      ...prev,
      [name]: { key: name, value: formatAttachmentValue(rawValue) },
    }));
  };

  const handleCollapseRow = (name: string) => {
    setEditValues((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const hasChanges = (name: string, rawValue: unknown) => {
    const edit = editValues[name];
    if (!edit) return false;
    const originalValue = formatAttachmentValue(rawValue);
    return edit.key !== name || edit.value !== originalValue;
  };

  const saveRowEdit = async (originalName: string) => {
    const edit = editValues[originalName];
    if (!edit) return;

    const trimmedKey = edit.key.trim();
    if (!trimmedKey) {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: "Name cannot be empty.",
      }));
      return;
    }

    const jsonError = validateJson(edit.value);
    if (jsonError) {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: `Invalid JSON: ${jsonError}`,
      }));
      return;
    }
    const parsedValue = JSON.parse(edit.value);

    if (originalName !== trimmedKey && trimmedKey in attachments) {
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: `Name '${trimmedKey}' already exists.`,
      }));
      return;
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
      setExpandedRowKeys([]);
      setEditValues((prev) => {
        const copy = { ...prev };
        delete copy[originalName];
        return copy;
      });
      setRowErrors((prev) => {
        const copy = { ...prev };
        delete copy[originalName];
        return copy;
      });
      message.success("Attachment saved");
      await loadAttachments();
    } catch (err) {
      const errorMsg =
        err instanceof APIError
          ? err.message || "Failed to save attachment."
          : "Failed to save attachment.";
      setRowErrors((prev) => ({
        ...prev,
        [originalName]: errorMsg,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const discardRowChanges = (name: string, rawValue: unknown) => {
    setEditValues((prev) => ({
      ...prev,
      [name]: { key: name, value: formatAttachmentValue(rawValue) },
    }));
    setRowErrors((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
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

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      message.success("Copied to clipboard");
    } catch {
      message.error("Failed to copy");
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
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={editing !== null}
                title="Edit"
                onClick={() => startEdit(row.name, row.rawValue)}
                className="actionIcon"
              />
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
            </>
          )}
        </div>
      );
    },
  });

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

      {Object.keys(attachments).length > 0 && (
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
              const addedKeys = newKeys.filter(
                (k) => !expandedRowKeys.includes(k),
              );
              const removedKeys = expandedRowKeys.filter(
                (k) => !newKeys.includes(k),
              );
              for (const key of addedKeys) {
                const row = tableData.find((r) => r.name === key);
                if (row) handleExpandRow(key, row.rawValue);
              }
              for (const key of removedKeys) {
                handleCollapseRow(key);
              }
              setExpandedRowKeys(newKeys);
            },
            expandedRowRender: (record: AttachmentTableRow) => {
              const edit = editValues[record.name];
              const currentKey = edit?.key ?? record.name;
              const currentValue =
                edit?.value ?? formatAttachmentValue(record.rawValue);
              const changed = hasChanges(record.name, record.rawValue);
              const rowError = rowErrors[record.name];

              return (
                <div className="expandedEditRow">
                  <div className="expandedEditFields">
                    <Input
                      value={currentKey}
                      onChange={(e) => {
                        setEditValues((prev) => ({
                          ...prev,
                          [record.name]: {
                            ...prev[record.name],
                            key: e.target.value,
                          },
                        }));
                        setRowErrors((prev) => {
                          const copy = { ...prev };
                          delete copy[record.name];
                          return copy;
                        });
                      }}
                      placeholder="Name"
                      disabled={!editable}
                    />
                    <div
                      className={`monacoEditorWrapper${rowDragOver === record.name ? " dragOver" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (editable) setRowDragOver(record.name);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const relatedTarget = e.relatedTarget as Node | null;
                        if (
                          !relatedTarget ||
                          !e.currentTarget.contains(relatedTarget)
                        ) {
                          setRowDragOver(null);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRowDragOver(null);
                        if (!editable) return;

                        const files = Array.from(e.dataTransfer.files).filter(
                          (f) =>
                            f.name.endsWith(".json") ||
                            f.type === "application/json",
                        );
                        if (files.length === 0) {
                          message.error("Only JSON files are supported.");
                          return;
                        }
                        const [file] = files;
                        const fileName = file.name.replace(/\.[^.]+$/, "");
                        try {
                          const text = await readFileAsText(file);
                          const parsed = JSON.parse(text);
                          const formatted = JSON.stringify(parsed, null, 2);
                          const currentEdit = editValues[record.name];
                          const shouldSetKey =
                            !currentEdit?.key?.trim() ||
                            currentEdit.key === record.name;
                          setEditValues((prev) => ({
                            ...prev,
                            [record.name]: {
                              ...prev[record.name],
                              value: formatted,
                              ...(shouldSetKey ? { key: fileName } : {}),
                            },
                          }));
                          setRowErrors((prev) => {
                            const copy = { ...prev };
                            delete copy[record.name];
                            return copy;
                          });
                          message.success("File loaded");
                        } catch {
                          message.error("File does not contain valid JSON.");
                        }
                      }}
                    >
                      {rowDragOver === record.name && (
                        <div className="editorDropOverlay">
                          <Typography.Text type="secondary">
                            Drop JSON file here
                          </Typography.Text>
                        </div>
                      )}
                      <Editor
                        height={`${Math.min(400, Math.max(100, (currentValue + "\n").split("\n").length * 18))}px`}
                        language="json"
                        value={currentValue}
                        onChange={(newValue) => {
                          setEditValues((prev) => ({
                            ...prev,
                            [record.name]: {
                              ...prev[record.name],
                              value: newValue ?? "",
                            },
                          }));
                          setRowErrors((prev) => {
                            const copy = { ...prev };
                            delete copy[record.name];
                            return copy;
                          });
                        }}
                        options={{
                          minimap: { enabled: false },
                          lineNumbers: "on",
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          automaticLayout: true,
                          folding: false,
                          glyphMargin: false,
                          lineDecorationsWidth: 10,
                          lineNumbersMinChars: 3,
                          renderLineHighlight: "none",
                          scrollbar: {
                            vertical: "auto",
                            horizontal: "hidden",
                            verticalScrollbarSize: 8,
                          },
                          readOnly: !editable,
                          quickSuggestions: false,
                          suggestOnTriggerCharacters: false,
                          parameterHints: { enabled: false },
                        }}
                      />
                    </div>
                  </div>
                  <div className="expandedEditActions">
                    {editable && !rowError && (
                      <span className="dropHintText">
                        <Typography.Text type="secondary">
                          Tip: drag & drop JSON file
                        </Typography.Text>
                      </span>
                    )}
                    {rowError && (
                      <span className="expandedRowError">
                        <span className="expandedRowErrorX">✗</span>
                        <span>{rowError}</span>
                      </span>
                    )}
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(currentValue)}
                    >
                      Copy
                    </Button>
                    {editable && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={() => saveRowEdit(record.name)}
                        loading={isSaving}
                        disabled={!changed}
                      >
                        Save
                      </Button>
                    )}
                    {changed ? (
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          discardRowChanges(record.name, record.rawValue);
                        }}
                      >
                        Cancel
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => {
                          setExpandedRowKeys((keys) =>
                            keys.filter((k) => k !== record.name),
                          );
                          handleCollapseRow(record.name);
                        }}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>
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
            message={deleteError}
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
