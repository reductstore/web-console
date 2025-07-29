import React, { useEffect, useState } from "react";
import { Input, Modal, Alert, Flex, Button } from "antd";

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
      closable={false}
      title={`Rename ${resourceType} "${name}"?`}
      data-testid="rename-modal"
      footer={[
        <Button key="back" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={() => onRename(newName.trim())}
        >
          Save
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
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          data-testid="rename-input"
        />
      </Flex>
    </Modal>
  );
}
