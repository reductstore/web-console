import React, { useState } from "react";
import { Alert, Button, Input, Modal, message } from "antd";
import { useQueryStore } from "../../stores/queryStore";

interface SaveQueryModalProps {
  open: boolean;
  onClose: () => void;
  bucketName: string;
  entryName: string | string[];
  queryText: string;
  timeFormat: "UTC" | "Unix";
  rangeKey: string;
  rangeStart?: string;
  rangeEnd?: string;
}

export default function SaveQueryModal({
  open,
  onClose,
  bucketName,
  entryName,
  queryText,
  timeFormat,
  rangeKey,
  rangeStart,
  rangeEnd,
}: SaveQueryModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<string | null>(null);
  const { saveQuery, getQueries } = useQueryStore();

  const handleSave = (forceName?: string) => {
    const queryName = (forceName ?? name).trim();
    if (!queryName) {
      setError("Query name is required.");
      return;
    }

    const existing = getQueries(bucketName, entryName);
    if (!forceName && existing.some((q) => q.name === queryName)) {
      setOverwriteTarget(queryName);
      return;
    }

    saveQuery(bucketName, entryName, {
      name: queryName,
      query: queryText,
      timeFormat,
      rangeKey,
      rangeStart,
      rangeEnd,
      bucketName,
      entries: Array.isArray(entryName) ? [...entryName] : [entryName],
    });
    message.success(`Query "${queryName}" saved`);
    handleClose();
  };

  const handleClose = () => {
    setName("");
    setError(null);
    setOverwriteTarget(null);
    onClose();
  };

  const handleOverwriteConfirm = () => {
    const target = overwriteTarget;
    setOverwriteTarget(null);
    if (target) {
      handleSave(target);
    }
  };

  return (
    <>
      <Modal
        title="Save Query"
        open={open && !overwriteTarget}
        onCancel={handleClose}
        footer={[
          <Button key="cancel" onClick={handleClose}>
            Cancel
          </Button>,
          <Button
            key="save"
            type="primary"
            disabled={!name.trim()}
            onClick={() => handleSave()}
          >
            Save
          </Button>,
        ]}
      >
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            data-testid="save-query-error"
          />
        )}
        <Input
          placeholder="Enter query name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onPressEnter={() => handleSave()}
          data-testid="query-name-input"
          autoFocus
        />
      </Modal>
      <Modal
        title="Overwrite Query"
        open={!!overwriteTarget}
        onCancel={() => setOverwriteTarget(null)}
        footer={[
          <Button key="cancel" onClick={() => setOverwriteTarget(null)}>
            Cancel
          </Button>,
          <Button
            key="overwrite"
            type="primary"
            danger
            onClick={handleOverwriteConfirm}
          >
            Overwrite
          </Button>,
        ]}
      >
        A query named &quot;{overwriteTarget}&quot; already exists. Do you want
        to overwrite it?
      </Modal>
    </>
  );
}
