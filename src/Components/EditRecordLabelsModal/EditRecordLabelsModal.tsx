import React, { useState, useEffect } from "react";
import { Modal, Typography, Alert } from "antd";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/edit/closebrackets";
import "./EditRecordLabelsModal.css";
import { APIError } from "reduct-js";

interface EditRecordLabelsModalProps {
  isVisible: boolean;
  onCancel: () => void;
  record: any;
  client: any;
  bucketName: string;
  entryName: string;
  showUnix: boolean;
  onLabelsUpdated: () => void;
}

const EditRecordLabelsModal: React.FC<EditRecordLabelsModalProps> = ({
  isVisible,
  onCancel,
  record,
  client,
  bucketName,
  entryName,
  showUnix,
  onLabelsUpdated,
}) => {
  const [labelsJson, setLabelsJson] = useState<string>("{}");
  const [labelUpdateError, setLabelUpdateError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  // Prepare the initial JSON when the record changes
  useEffect(() => {
    if (record && isVisible) {
      setLabelUpdateError(null);

      try {
        const labels = record.labels || {};

        const labelsObj =
          typeof labels === "string" ? JSON.parse(labels) : labels;

        const formattedLabels = JSON.stringify(labelsObj, null, 2);
        setLabelsJson(formattedLabels);

        setEditorKey(Date.now());
      } catch (error) {
        console.error("Error preparing labels for display:", error);
        setLabelsJson("{}");
      }
    }
  }, [record, isVisible]);

  // Force CodeMirror to refresh after the modal is fully visible
  useEffect(() => {
    if (isVisible) {
      const timer1 = setTimeout(() => {
        setEditorKey(Date.now());
      }, 100);

      const timer2 = setTimeout(() => {
        setEditorKey(Date.now());
      }, 300);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isVisible]);

  const handleUpdateLabels = async () => {
    if (!record) return;

    setLabelUpdateError(null);

    try {
      const labels = JSON.parse(labelsJson);
      const { timestamp } = record;

      const bucket = await client.getBucket(bucketName);
      await bucket.update(entryName, timestamp, labels);

      onLabelsUpdated();
      onCancel();
    } catch (err) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setLabelUpdateError("Invalid JSON format: " + err.message);
      } else if (err instanceof APIError) {
        setLabelUpdateError(err.message || "API Error");
      } else if (err instanceof Error) {
        setLabelUpdateError(err.message || "Failed to update labels.");
      } else {
        setLabelUpdateError("Failed to update labels: " + String(err));
      }
    }
  };

  return (
    <Modal
      title="Edit Record Labels"
      open={isVisible}
      onCancel={onCancel}
      onOk={handleUpdateLabels}
      okText="Update Labels"
      width={600}
      className="edit-record-labels-modal"
    >
      {record && (
        <>
          <div className="record-info">
            <Typography.Text className="record-info-label">
              Record Timestamp:{" "}
            </Typography.Text>
            <Typography.Text>
              {showUnix
                ? record.key
                : new Date(Number(record.timestamp / 1000n)).toISOString()}
            </Typography.Text>
          </div>
          <div className="record-info">
            <Typography.Text className="record-info-label">
              Content Type:{" "}
            </Typography.Text>
            <Typography.Text>{record.contentType}</Typography.Text>
          </div>
          <div className="record-info">
            <Typography.Text className="record-info-label">
              Size:{" "}
            </Typography.Text>
            <Typography.Text>{record.size}</Typography.Text>
          </div>
          <Typography.Text>Edit Labels (JSON format):</Typography.Text>
          <div className="help-text">
            <Typography.Text type="secondary">
              Note: To remove a label, remove the key-value pair from the JSON
            </Typography.Text>
          </div>
          <div className="json-editor-container">
            <CodeMirror
              key={`editor-${editorKey}`}
              className="jsonEditor"
              value={labelsJson}
              options={{
                mode: { name: "javascript", json: true },
                theme: "default",
                lineNumbers: true,
                lineWrapping: true,
                viewportMargin: Infinity,
                matchBrackets: true,
                autoCloseBrackets: true,
                firstLineNumber: 1,
                indentWithTabs: false,
                indentUnit: 2,
                tabSize: 2,
              }}
              onBeforeChange={(editor: any, data: any, value: string) => {
                setLabelsJson(value);
              }}
              onBlur={(editor: any) => {
                const value = editor.getValue() || "";
                try {
                  // Parse and reformat to ensure proper structure
                  const parsed = JSON.parse(value);
                  const formatted = JSON.stringify(parsed, null, 2);
                  setLabelsJson(formatted);
                } catch (e) {
                  // Keep the value as is if it's not valid JSON
                  console.error("Error formatting JSON on blur:", e);
                }
              }}
            />
          </div>
          {labelUpdateError && (
            <Alert
              type="error"
              message={labelUpdateError}
              className="error-message"
            />
          )}
        </>
      )}
    </Modal>
  );
};

export default EditRecordLabelsModal;
