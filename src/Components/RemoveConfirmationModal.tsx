import React, { useState } from "react";
import { Alert, Flex, Form, Input, Modal } from "antd";

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
      onOk={() => {
        onRemove();
      }}
      onCancel={onCancel}
      closable={false}
      title={`Remove ${resourceType} "${name}"?`}
      okText="Remove"
      confirmLoading={!confirmName}
      okType="danger"
      data-testid="delete-modal"
    >
      <Flex vertical gap="small">
        <p>
          For confirmation type <b>{name}</b>
        </p>
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            data-testid="error-alert"
          />
        )}
        <Form.Item name="confirm">
          <Input
            onChange={(e) => checkName(e.target.value)}
            data-testid="confirm-input"
          />
        </Form.Item>
      </Flex>
    </Modal>
  );
}
