import React, { useState, useEffect, createContext, useContext } from "react";
import { Modal, Typography, Alert, Table, Input, Button, Form } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import "./EditRecordLabelsModal.css";

interface EditRecordLabelsModalProps {
  isVisible: boolean;
  onCancel: () => void;
  record: any;
  showUnix: boolean;
  onLabelsUpdated: (
    newLabels: Record<string, string>,
    timestamp: bigint,
  ) => void;
}

const EditableContext = createContext<any>(null);

const EditableRow: React.FC<any> = ({ index, ...props }) => {
  const [form] = Form.useForm();
  return (
    <Form form={form} component={false}>
      <EditableContext.Provider value={form}>
        <tr {...props} />
      </EditableContext.Provider>
    </Form>
  );
};

const EditableCell: React.FC<any> = ({
  title,
  editable,
  children,
  dataIndex,
  record,
  handleSave,
  ...restProps
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = React.useRef<any>(null);
  const form = useContext(EditableContext);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({ [dataIndex]: record[dataIndex] });
      inputRef.current?.focus();
    }
  }, [editing, form, dataIndex, record]);

  const toggleEdit = () => {
    setEditing(!editing);
  };

  const save = async () => {
    try {
      const values = await form.validateFields();
      toggleEdit();
      handleSave({ ...record, [dataIndex]: values[dataIndex] });
    } catch (errInfo) {
      console.log("Save failed:", errInfo);
    }
  };

  let childNode = children;

  if (editable) {
    childNode = editing ? (
      <Form.Item
        className="edit-form-item"
        name={dataIndex}
        rules={[
          {
            required: true,
            message: `${title} is required.`,
          },
        ]}
      >
        <Input
          ref={inputRef}
          onPressEnter={save}
          onBlur={save}
          placeholder={dataIndex === "key" ? "Enter key" : "Enter value"}
          className="edit-input"
        />
      </Form.Item>
    ) : (
      <div className="editable-cell-value-wrap" onClick={toggleEdit}>
        {children || (
          <span className="placeholder-text">
            {dataIndex === "key" ? "Enter key" : "Enter value"}
          </span>
        )}
      </div>
    );
  }

  return <td {...restProps}>{childNode}</td>;
};

interface LabelItem {
  id: string;
  key: string;
  value: string;
  originalKey?: string;
}

const EditRecordLabelsModal: React.FC<EditRecordLabelsModalProps> = ({
  isVisible,
  onCancel,
  record,
  showUnix,
  onLabelsUpdated,
}) => {
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [labelUpdateError, setLabelUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;
    setLabelUpdateError(null);
    try {
      const labels = record.labels || {};
      const labelsObj =
        typeof labels === "string" ? JSON.parse(labels) : labels;

      const items = Object.entries(labelsObj).map(([key, value], index) => ({
        id: `label-${index}`,
        key,
        value: String(value),
        originalKey: key,
      }));

      setLabelItems(items);
    } catch (error) {
      console.error("Error preparing labels for display:", error);
      setLabelItems([]);
    }
  }, [record]);

  const handleUpdateLabels = () => {
    if (!record) return;
    setLabelUpdateError(null);
    try {
      const keySet = new Set<string>();
      const duplicateKeys: string[] = [];

      labelItems.forEach((item) => {
        if (item.key && keySet.has(item.key)) {
          duplicateKeys.push(item.key);
        } else if (item.key) {
          keySet.add(item.key);
        }
      });

      if (duplicateKeys.length > 0) {
        setLabelUpdateError(
          `Duplicate keys found: ${duplicateKeys.join(", ")}. Please ensure all keys are unique.`,
        );
        return;
      }

      const originalLabels = record.labels || {};
      const originalLabelsObj =
        typeof originalLabels === "string"
          ? JSON.parse(originalLabels)
          : originalLabels;

      const newLabels: Record<string, string> = {};

      labelItems.forEach((item) => {
        if (item.key.trim()) {
          newLabels[item.key] = item.value;
        }
      });

      const keysToRemove = new Set<string>();
      Object.keys(originalLabelsObj).forEach((originalKey) => {
        if (!Object.keys(newLabels).includes(originalKey)) {
          keysToRemove.add(originalKey);
        }
      });

      keysToRemove.forEach((key) => {
        newLabels[key] = "";
      });

      const { timestamp } = record;

      onLabelsUpdated(newLabels, timestamp);
      onCancel();
    } catch (err) {
      if (err instanceof Error)
        setLabelUpdateError(err.message || "Failed to update labels.");
      else setLabelUpdateError("Failed to update labels: " + String(err));
    }
  };

  const handleSave = (row: LabelItem) => {
    const newData = [...labelItems];
    const index = newData.findIndex((item) => item.id === row.id);

    if (index > -1) {
      const updatedItem = {
        ...newData[index],
        ...row,
      };

      newData.splice(index, 1, updatedItem);
      setLabelItems(newData);
    }
  };

  const handleDelete = (id: string) => {
    setLabelItems(labelItems.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    const newId = `label-${Date.now()}`;
    const newItem: LabelItem = {
      id: newId,
      key: "",
      value: "",
      originalKey: undefined,
    };

    setLabelItems([...labelItems, newItem]);
  };

  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      width: "40%",
      editable: true,
    },
    {
      title: "Value",
      dataIndex: "value",
      width: "40%",
      editable: true,
    },
    {
      title: "Action",
      dataIndex: "operation",
      render: (_: any, record: LabelItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id)}
        />
      ),
    },
  ];

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  const columnsWithEditable = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record: LabelItem) => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave,
      }),
    };
  });

  return (
    <Modal
      open={isVisible}
      width={600}
      className="edit-record-labels-modal"
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleUpdateLabels}>
          Update Labels
        </Button>,
      ]}
    >
      {record && (
        <>
          <div className="record-info">
            <Typography.Text className="record-info-label">
              Timestamp:{" "}
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
          <Typography.Text className="record-info-label">
            Labels:
          </Typography.Text>
          <div className="label-table-container">
            <Button
              style={{ float: "right" }}
              onClick={handleAdd}
              className="add-label-button"
              icon={<PlusOutlined />}
              title="Add"
            />
            <Table
              components={components}
              rowClassName="editable-row"
              bordered
              dataSource={labelItems}
              columns={columnsWithEditable}
              pagination={false}
              rowKey="id"
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
