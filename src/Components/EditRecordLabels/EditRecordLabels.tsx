import React, { useState, useEffect } from "react";
import { Alert, Button, Space, Typography } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  InsertRowBelowOutlined,
  UndoOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import "./EditRecordLabels.css";
import ScrollableTable from "../ScrollableTable";
import EditableRow from "./EditableRow";
import EditableCell from "./EditableCell";

interface EditRecordLabelsProps {
  record: any;
  onLabelsUpdated: (
    newLabels: Record<string, string>,
    timestamp: bigint,
  ) => void;
  onCancel?: () => void;
  editable?: boolean;
}

interface LabelItem {
  id: string;
  key: string;
  value: string;
  editable?: boolean;
  originalKey?: string;
  isModified?: boolean;
  isNew?: boolean;
}

const filterValidLabels = (obj: any) => {
  const src = typeof obj === "string" ? JSON.parse(obj) : obj || {};
  return Object.fromEntries(
    Object.entries(src).filter(([, v]) => v !== "" && v != null),
  );
};

const EditRecordLabels: React.FC<EditRecordLabelsProps> = ({
  record,
  onLabelsUpdated,
  editable = false,
}) => {
  const [labelItems, setLabelItems] = useState<LabelItem[]>([]);
  const [labelUpdateError, setLabelUpdateError] = useState<string | null>(null);
  const [lastSavedLabels, setLastSavedLabels] = useState<string | null>(null);

  const hasChangesToUpdate = () => {
    if (!record) return false;
    try {
      const originalLabels = filterValidLabels(record.labels);
      const currentLabels: Record<string, string> = {};
      labelItems.forEach((item) => {
        if (item.key.trim()) currentLabels[item.key] = item.value;
      });
      return JSON.stringify(originalLabels) !== JSON.stringify(currentLabels);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!record) return;

    const currentLabelsStr = JSON.stringify(record.labels);

    if (currentLabelsStr === lastSavedLabels) {
      return;
    }

    setLabelUpdateError(null);
    try {
      const clean = filterValidLabels(record.labels);
      const items = Object.entries(clean).map(([key, value]) => ({
        id: `lbl-${String(record.timestamp)}-${key}`,
        key,
        value: String(value),
        originalKey: key,
        isModified: false,
        isNew: false,
      }));
      setLabelItems(items);
    } catch {
      setLabelItems([]);
    }
  }, [record?.timestamp, record?.labels]);

  const handleUpdateLabels = () => {
    if (!record) return;
    setLabelUpdateError(null);
    try {
      const keySet = new Set<string>();
      const duplicateKeys: string[] = [];
      const emptyKeyItems: number[] = [];
      const emptyValueItems: number[] = [];

      for (let i = 0; i < labelItems.length; i++) {
        const item = labelItems[i];
        const k = item.key?.trim();
        const v = item.value?.trim();

        if (!k) {
          emptyKeyItems.push(i + 1);
          continue;
        }

        if (!v) {
          emptyValueItems.push(i + 1);
        }

        if (keySet.has(k)) duplicateKeys.push(k);
        else keySet.add(k);
      }

      if (emptyKeyItems.length > 0) {
        setLabelUpdateError(
          `Empty key found in row(s): ${emptyKeyItems.join(", ")}`,
        );
        return;
      }

      if (emptyValueItems.length > 0) {
        setLabelUpdateError(
          `Empty value found in row(s): ${emptyValueItems.join(", ")}. Please provide a value for each label.`,
        );
        return;
      }

      if (duplicateKeys.length > 0) {
        setLabelUpdateError(
          `Duplicate keys found: ${duplicateKeys.join(", ")}`,
        );
        return;
      }

      const newLabels: Record<string, string> = {};
      labelItems.forEach((item) => {
        const k = item.key?.trim();
        if (k) newLabels[k] = item.value;
      });
      setLastSavedLabels(JSON.stringify(newLabels));
      onLabelsUpdated(newLabels, record.timestamp);
    } catch (err) {
      setLabelUpdateError(
        err instanceof Error ? err.message : "Failed to update labels",
      );
    }
  };

  const handleSave = (row: LabelItem) => {
    setLabelUpdateError(null);

    const newData = [...labelItems];
    const index = newData.findIndex((item) => item.id === row.id);
    if (index > -1) {
      const originalItem = newData[index];
      let isModified = false;
      if (originalItem.isNew) {
        isModified = row.key.trim() !== "" || row.value.trim() !== "";
      } else {
        try {
          const labelsObj = filterValidLabels(record?.labels);
          const originalKey = originalItem.originalKey || row.key;
          const originalValue = String(labelsObj[originalKey] || "");
          isModified = row.key !== originalKey || row.value !== originalValue;
        } catch {
          isModified = true;
        }
      }
      const updatedItem = { ...newData[index], ...row, isModified };
      newData.splice(index, 1, updatedItem);
      setLabelItems(newData);
    }
  };

  const handleDelete = (id: string) => {
    setLabelUpdateError(null);

    setLabelItems(labelItems.filter((item) => item.id !== id));
  };

  const handleAdd = (targetId?: string) => {
    setLabelUpdateError(null);

    const newId = `lbl-new-${Date.now()}`;
    const newItem: LabelItem = {
      id: newId,
      key: "",
      value: "",
      originalKey: undefined,
      isModified: false,
      isNew: true,
    };
    if (!targetId) {
      setLabelItems([...labelItems, newItem]);
      return;
    }
    const targetIndex = labelItems.findIndex((item) => item.id === targetId);
    const newData = [...labelItems];
    newData.splice(targetIndex + 1, 0, newItem);
    setLabelItems(newData);
  };

  const handleRevert = () => {
    if (!record) return;
    try {
      const clean = filterValidLabels(record.labels);
      const items = Object.entries(clean).map(([key, value]) => ({
        id: `lbl-${String(record.timestamp)}-${key}`,
        key,
        value: String(value),
        originalKey: key,
        isModified: false,
        isNew: false,
      }));
      setLabelItems(items);
      setLabelUpdateError(null);
    } catch (error) {
      console.error("Failed to revert labels", error);
    }
  };

  const handleRowRevert = (rowId: string) => {
    if (!record) return;
    setLabelUpdateError(null);

    const newData = [...labelItems];
    const index = newData.findIndex((item) => item.id === rowId);
    if (index > -1) {
      const item = newData[index];
      if (item.isNew) {
        const filtered = labelItems.filter((i) => i.id !== rowId);
        setLabelItems(filtered);
      } else {
        try {
          const labelsObj = filterValidLabels(record.labels);
          const originalValue = labelsObj[item.originalKey || item.key] || "";
          const revertedItem = {
            ...item,
            key: item.originalKey || item.key,
            value: String(originalValue),
            isModified: false,
          };
          newData.splice(index, 1, revertedItem);
          setLabelItems(newData);
        } catch (error) {
          console.error("Failed to revert row", error);
        }
      }
    }
  };

  const columns = [
    {
      title: "Key",
      dataIndex: "key",
      width: editable ? "40%" : "50%",
      editable: editable,
      ellipsis: true,
    },
    {
      title: "Value",
      dataIndex: "value",
      width: editable ? "40%" : "50%",
      editable: editable,
      ellipsis: true,
    },
    ...(editable
      ? [
          {
            title: "Actions",
            dataIndex: "operation",
            width: "20%",
            render: (_: any, record: LabelItem) => (
              <Space size="small" className="row-actions">
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => handleRowRevert(record.id)}
                  title={
                    record.isModified
                      ? "Revert changes"
                      : "No changes to revert"
                  }
                  className="action-icon revert-icon"
                  disabled={!record.isModified}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<InsertRowBelowOutlined />}
                  onClick={() => handleAdd(record.id)}
                  title="Insert row below"
                  className="action-icon add-below-icon"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                  title="Delete label"
                  className="action-icon delete-icon"
                />
              </Space>
            ),
          },
        ]
      : []),
  ];

  const components = {
    body: {
      row: EditableRow,
      cell: EditableCell,
    },
  };

  const columnsWithEditable = columns.map((col) => {
    if (!(col as any).editable) return col;
    return {
      ...col,
      onCell: (record: LabelItem) => ({
        record,
        editable: (col as any).editable,
        dataIndex: (col as any).dataIndex,
        title: (col as any).title,
        handleSave,
      }),
    };
  });

  return (
    <>
      {record && (
        <>
          <Typography.Text strong className="labelsTitle">
            Labels
          </Typography.Text>
          <div className="labelTableContainer">
            <ScrollableTable
              scroll={{ y: 300 }}
              components={components}
              rowClassName="editableRow"
              size="small"
              bordered
              dataSource={labelItems}
              columns={columnsWithEditable as any}
              pagination={false}
              rowKey="id"
            />
          </div>
          {labelUpdateError && (
            <Alert
              type="error"
              message={labelUpdateError}
              className="errorMessage"
            />
          )}
          {editable && (
            <div className="buttonContainer">
              <Space>
                <Button
                  onClick={() => handleAdd()}
                  icon={<PlusOutlined />}
                  title="Add new label"
                />
                <Button
                  onClick={handleRevert}
                  icon={<UndoOutlined />}
                  title="Revert changes"
                  disabled={!hasChangesToUpdate()}
                />
                <Button
                  type="primary"
                  onClick={handleUpdateLabels}
                  disabled={!hasChangesToUpdate()}
                  icon={<SaveOutlined />}
                  title="Update labels"
                />
              </Space>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default EditRecordLabels;
