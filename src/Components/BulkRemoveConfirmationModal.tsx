import React, { useState } from "react";
import { Alert, Button, Flex, Input, Modal, Progress, theme } from "antd";

interface BulkRemoveConfirmationModalProps {
  count: number;
  resourceType: string;
  onConfirm: () => void;
  onCancel: () => void;
  open: boolean;
  loading?: boolean;
  progress?: { done: number; total: number };
  errorMessage?: string | null;
  warningMessage?: string | null;
}

export default function BulkRemoveConfirmationModal({
  count,
  resourceType,
  onConfirm,
  onCancel,
  open,
  loading,
  progress,
  errorMessage,
  warningMessage,
}: Readonly<BulkRemoveConfirmationModalProps>) {
  const [inputValue, setInputValue] = useState("");
  const { token } = theme.useToken();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const confirmed = inputValue === "DELETE";

  const plural = count === 1 ? resourceType : `${resourceType}s`;

  return (
    <Modal
      open={open}
      closable={false}
      title={`Remove ${count} ${plural}?`}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="default"
          danger
          onClick={onConfirm}
          disabled={!confirmed || loading}
          loading={loading}
        >
          Remove
        </Button>,
      ]}
      afterOpenChange={(visible) => {
        if (!visible) setInputValue("");
      }}
    >
      <Flex vertical gap="small">
        {warningMessage && (
          <Alert title={warningMessage} type="warning" showIcon />
        )}
        {errorMessage && <Alert title={errorMessage} type="error" showIcon />}
        {progress && (
          <Progress
            percent={Math.round((progress.done / progress.total) * 100)}
            format={() => `${progress.done}/${progress.total}`}
            size="small"
            strokeColor={token.colorPrimary}
          />
        )}
        <Input
          placeholder='Type "DELETE" to confirm'
          value={inputValue}
          onChange={handleInputChange}
          disabled={loading}
          data-testid="bulk-confirm-input"
        />
      </Flex>
    </Modal>
  );
}
