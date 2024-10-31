import React, { useEffect, useState } from "react";
import { Input, Modal, Alert, Flex } from "antd";

interface RenameModalProps {
  name: string;
  onRename: (newName: string) => void;
  onCancel: () => void;
  resourceType: string;
  open: boolean;
  errorMessage?: string | null;
}

export default function RenameModal({
  name,
  onRename,
  onCancel,
  resourceType,
  open,
  errorMessage,
}: RenameModalProps) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    setNewName(name);
  }, [name]);

  const handleCancel = () => {
    setNewName(name);
    onCancel();
  };

  return (
    <Modal
      open={open}
      onOk={() => onRename(newName.trim())}
      onCancel={handleCancel}
      closable={false}
      title={`Rename ${resourceType} "${name}"?`}
      okText="Save"
      data-testid="rename-modal"
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
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          data-testid="confirm-input"
        />
      </Flex>
    </Modal>
  );
}
