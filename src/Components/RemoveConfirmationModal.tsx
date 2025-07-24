import React, { useState } from "react";
import { Alert, Button, Flex, Input, Modal } from "antd";

interface RemoveConfirmationModalProps {
  name: string;
  onRemove: () => void;
  onCancel: () => void;
  resourceType: string;
  open: boolean;
  errorMessage?: string | null;
}

export default function RemoveConfirmationModal({
  name,
  onRemove,
  onCancel,
  resourceType,
  open,
  errorMessage,
}: RemoveConfirmationModalProps) {
  const [confirmName, setConfirmName] = useState(false);

  const checkName = (bucketName: string) => {
    setConfirmName(bucketName == name);
  };

  return (
    <Modal
      open={open}
      closable={false}
      title={`Remove ${resourceType} "${name}"?`}
      data-testid="delete-modal"
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="default"
          danger
          onClick={onRemove}
          disabled={!confirmName}
          loading={!confirmName}
        >
          Remove
        </Button>,
      ]}
    >
      <Flex vertical gap="small">
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            data-testid="error-alert"
          />
        )}
        <Input
          placeholder={`Type the name of the ${resourceType} to confirm`}
          onChange={(e) => checkName(e.target.value)}
          data-testid="confirm-input"
        />
      </Flex>
    </Modal>
  );
}
