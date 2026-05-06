import React, { useState } from "react";
import { Button, Input, Modal, Tooltip, Typography, message } from "antd";
import Editor from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import {
  SaveOutlined,
  CloseOutlined,
  CompressOutlined,
  ExpandOutlined,
  FormatPainterOutlined,
} from "@ant-design/icons";
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
  /** Whether this is a binary attachment (no content editing) */
  binaryMode?: boolean;
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
  /** Whether the editor can be expanded into a modal */
  expandable?: boolean;
  /** Modal title when expanded */
  expandedTitle?: string;
}

const AttachmentEditor: React.FC<AttachmentEditorProps> = ({
  initialKey = "",
  initialValue = "",
  readOnly = false,
  binaryMode = false,
  onSave,
  onClose,
  isSaving = false,
  error = null,
  onClearError,
  expandable = false,
  expandedTitle = "Attachment Editor",
}) => {
  const [name, setName] = useState(initialKey);
  const [content, setContent] = useState(initialValue);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const displayError = error ?? localError;

  const hasChanges = binaryMode
    ? name !== initialKey
    : name !== initialKey || content !== initialValue;

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

  const handleFormat = () => {
    editorInstance?.getAction("editor.action.formatDocument")?.run();
  };

  const handleSave = async () => {
    if (!readOnly && !binaryMode && editorInstance) {
      await editorInstance.getAction("editor.action.formatDocument")?.run();
    }

    const currentContent = editorInstance?.getValue() ?? content;
    if (currentContent !== content) {
      setContent(currentContent);
    }

    const trimmedKey = name.trim();
    if (!trimmedKey) {
      setLocalError("Name cannot be empty.");
      return;
    }

    if (!binaryMode) {
      const jsonError = validateJson(currentContent);
      if (jsonError) {
        setLocalError(`Invalid JSON: ${jsonError}`);
        return;
      }
    }

    const success = await onSave(trimmedKey, currentContent);
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
      setIsExpanded(false);
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

  const renderEditor = (expanded = false) => (
    <div className="expandedEditRow">
      <div className="expandedEditFields">
        <Input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Name"
          disabled={readOnly}
        />
        {binaryMode ? (
          <div
            className={`monacoEditorWrapper${expanded ? " expanded" : ""}`}
            style={{ padding: "8px 12px" }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Format is not supported for preview
            </Typography.Text>
          </div>
        ) : (
          <div
            className={`monacoEditorWrapper${isDragOver ? " dragOver" : ""}${expanded ? " expanded" : ""}`}
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
            <div className={`attachmentEditorBody${expanded ? " expanded" : ""}`}>
              <Editor
                height={expanded ? "100%" : `${editorHeight}px`}
                language="json"
                value={content}
                onChange={handleContentChange}
                onMount={(editor) => setEditorInstance(editor)}
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
        )}
      </div>
      <div className="attachmentEditorToolbar">
        <div className="attachmentEditorToolbarStatus">
          {!readOnly && !binaryMode && !displayError && (
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
        </div>
        <div className="attachmentEditorToolbarActions">
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={handleClose}
            className={`attachmentEditorCancelButton${hasChanges ? "" : " hidden"}`}
            disabled={!hasChanges}
            aria-hidden={!hasChanges}
            tabIndex={hasChanges ? 0 : -1}
          >
            Cancel
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
          {!binaryMode && (
            <Tooltip
              title={readOnly ? "Cannot format in read-only mode" : "Format JSON"}
            >
              <Button
                size="small"
                aria-label="Format JSON"
                icon={<FormatPainterOutlined />}
                onClick={handleFormat}
                disabled={readOnly}
              />
            </Tooltip>
          )}
          {expandable && (
            <Tooltip title={isExpanded ? "Collapse editor" : "Expand editor"}>
              <Button
                size="small"
                aria-label={isExpanded ? "Collapse editor" : "Expand editor"}
                icon={isExpanded ? <CompressOutlined /> : <ExpandOutlined />}
                onClick={() => setIsExpanded((prev) => !prev)}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isExpanded ? (
        <div className="attachmentEditorPlaceholder">
          Editing in expanded attachment editor
        </div>
      ) : (
        renderEditor(false)
      )}
      {expandable && isExpanded && (
        <Modal
          open={isExpanded}
          onCancel={() => setIsExpanded(false)}
          footer={null}
          closable
          title={expandedTitle}
          maskClosable={false}
          keyboard={false}
          className="attachmentEditorModal"
          width="90vw"
          centered
        >
          <div className="attachmentEditorModalContent">
            {renderEditor(true)}
          </div>
        </Modal>
      )}
    </>
  );
};

export default AttachmentEditor;
