import React, { useEffect, useState } from "react";
import { Form, Input, Modal } from "antd";

interface RemoveConfirmationModalProps {
  name: string;
  onRemove: () => void;
  onCancel: () => void;
  resourceType: string;
  confirm: boolean;
}

export default function RemoveConfirmationModal({
  name,
  onRemove,
  onCancel,
  resourceType,
  confirm,
}: RemoveConfirmationModalProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmName, setConfirmName] = useState(false);

  useEffect(() => {
    setConfirmRemove(confirm);
  }, [confirm]);

  const checkName = (bucketName: string) => {
    setConfirmName(bucketName == name);
  };

  return (
    <Modal
      open={confirmRemove}
      onOk={() => {
        onRemove();
        setConfirmRemove(false);
      }}
      onCancel={onCancel}
      closable={false}
      title={`Remove ${resourceType} "${name}"?`}
      okText="Remove"
      confirmLoading={!confirmName}
      okType="danger"
      data-testid="delete-modal"
    >
      <p>
        For confirmation type <b>{name}</b>
      </p>
      <Form.Item name="confirm">
        <Input
          onChange={(e) => checkName(e.target.value)}
          data-testid="confirm-input"
        ></Input>
      </Form.Item>
    </Modal>
  );
}
