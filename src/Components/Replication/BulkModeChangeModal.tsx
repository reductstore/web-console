import React, { useState } from "react";
import { Button, Flex, Modal, Progress, Select, theme, Alert } from "antd";
import { ReplicationMode } from "reduct-js";
import { MODE_SELECT_OPTIONS, MODE_SELECT_STYLE } from "./ReplicationModeUtils";

interface BulkModeChangeModalProps {
  count: number;
  open: boolean;
  onConfirm: (mode: ReplicationMode) => void;
  onCancel: () => void;
  loading?: boolean;
  progress?: { done: number; total: number };
  errorMessage?: string | null;
}

export default function BulkModeChangeModal({
  count,
  open,
  onConfirm,
  onCancel,
  loading,
  progress,
  errorMessage,
}: Readonly<BulkModeChangeModalProps>) {
  const [selectedMode, setSelectedMode] = useState<ReplicationMode>(
    ReplicationMode.ENABLED,
  );
  const { token } = theme.useToken();

  const plural = count === 1 ? "replication" : "replications";

  return (
    <Modal
      open={open}
      closable={false}
      title={`Change mode for ${count} ${plural}`}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={() => onConfirm(selectedMode)}
          disabled={loading}
          loading={loading}
        >
          Apply
        </Button>,
      ]}
      afterOpenChange={(visible) => {
        if (!visible) setSelectedMode(ReplicationMode.ENABLED);
      }}
    >
      <Flex vertical gap="small">
        {errorMessage && <Alert title={errorMessage} type="error" showIcon />}
        {progress && (
          <Progress
            percent={Math.round((progress.done / progress.total) * 100)}
            format={() => `${progress.done}/${progress.total}`}
            size="small"
            strokeColor={token.colorPrimary}
          />
        )}
        <Select
          value={selectedMode}
          onChange={setSelectedMode}
          style={MODE_SELECT_STYLE}
          options={MODE_SELECT_OPTIONS}
          disabled={loading}
        />
      </Flex>
    </Modal>
  );
}
