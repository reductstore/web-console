import React, { useState } from "react";
import { Button, Input, Typography, message } from "antd";
import Editor from "@monaco-editor/react";
import { SaveOutlined, CloseOutlined, CopyOutlined } from "@ant-design/icons";
import "./EntryAttachmentsCard.css";

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

interface AttachmentEditorProps {
  /** Initial name/key for the attachment */
  initialKey?: string;
  /** Initial JSON value */
  initialValue?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when save is clicked. Returns true if save succeeded. */
  onSave: (key: string, value: string) => Promise<boolean>;
  /** Callback when close/cancel is clicked */
  onClose: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** External error message to display */
  error?: string | null;
  /** Callback to clear external error */
  onClearError?: () => void;
}

const AttachmentEditor: React.FC<AttachmentEditorProps> = ({
  initialKey = "",
  initialValue = "",
  readOnly = false,
  onSave,
  onClose,
  isSaving = false,
  error = null,
  onClearError,
}) => {
  const [name, setName] = useState(initialKey);
  const [content, setContent] = useState(initialValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const displayError = error ?? localError;

  const hasChanges = name !== initialKey || content !== initialValue;

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success("Copied to clipboard");
    } catch {
      message.error("Failed to copy");
    }
  };

  const handleSave = async () => {
    const trimmedKey = name.trim();
    if (!trimmedKey) {
      setLocalError("Name cannot be empty.");
      return;
    }

    const jsonError = validateJson(content);
    if (jsonError) {
      setLocalError(`Invalid JSON: ${jsonError}`);
      return;
    }

    const success = await onSave(trimmedKey, content);
    if (success) {
      setLocalError(null);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setLocalError(null);
    onClearError?.();
  };

  const handleContentChange = (value: string | undefined) => {
    setContent(value ?? "");
    setLocalError(null);
    onClearError?.();
  };

  const handleClose = () => {
    if (hasChanges) {
      setName(initialKey);
      setContent(initialValue);
      setLocalError(null);
      onClearError?.();
    } else {
      onClose();
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (readOnly) return;

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".json") || f.type === "application/json",
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
      setContent(formatted);
      if (!name.trim()) {
        setName(fileName);
      }
      setLocalError(null);
      onClearError?.();
      message.success("File loaded");
    } catch {
      message.error("File does not contain valid JSON.");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const editorHeight = Math.min(
    400,
    Math.max(100, (content + "\n").split("\n").length * 18),
  );

  return (
    <div className="expandedEditRow">
      <div className="expandedEditFields">
        <Input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Name"
          disabled={readOnly}
        />
        <div
          className={`monacoEditorWrapper${isDragOver ? " dragOver" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragOver && (
            <div className="editorDropOverlay">
              <Typography.Text type="secondary">
                Drop JSON file here
              </Typography.Text>
            </div>
          )}
          <Editor
            height={`${editorHeight}px`}
            language="json"
            value={content}
            onChange={handleContentChange}
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
              readOnly: readOnly,
              quickSuggestions: false,
              suggestOnTriggerCharacters: false,
              parameterHints: { enabled: false },
            }}
          />
        </div>
      </div>
      <div className="expandedEditActions">
        {!readOnly && !displayError && (
          <span className="dropHintText">
            <Typography.Text type="secondary">
              Tip: drag & drop JSON file
            </Typography.Text>
          </span>
        )}
        {displayError && (
          <span className="expandedRowError">
            <span className="expandedRowErrorX">✗</span>
            <span>{displayError}</span>
          </span>
        )}
        <Button size="small" icon={<CopyOutlined />} onClick={copyToClipboard}>
          Copy
        </Button>
        {!readOnly && (
          <Button
            size="small"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={!hasChanges && initialKey !== ""}
          >
            Save
          </Button>
        )}
        {hasChanges ? (
          <Button size="small" icon={<CloseOutlined />} onClick={handleClose}>
            Cancel
          </Button>
        ) : (
          <Button size="small" icon={<CloseOutlined />} onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default AttachmentEditor;
