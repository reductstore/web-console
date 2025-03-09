import React, { useState } from "react";
import {
  Form,
  Upload,
  Button,
  Input,
  Alert,
  Typography,
  DatePicker,
  Select,
} from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { FormInstance } from "antd/lib/form";

interface UploadFileFormProps {
  onUpload: (values: any) => Promise<void>;
  isUploadLoading: boolean;
  uploadError: string;
  setUploadError: React.Dispatch<React.SetStateAction<string>>;
  setUploadFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploadForm: FormInstance;
  labels: { key: string; value: string }[];
  setLabels: React.Dispatch<
    React.SetStateAction<{ key: string; value: string }[]>
  >;
  entryName: string;
  isItemView: boolean;
  availableEntries: string[];
}

const UploadFileForm: React.FC<UploadFileFormProps> = ({
  onUpload,
  isUploadLoading,
  uploadError,
  setUploadError,
  setUploadFile,
  uploadForm,
  labels,
  setLabels,
  entryName,
  isItemView,
  availableEntries,
}) => {
  const [contentType, setContentType] = useState<string>("");

  const handleFileChange = (file: File) => {
    setUploadFile(file);
    setContentType(file.type || ""); // Set the detected MIME type or empty if not available
  };

  return (
    <Form
      form={uploadForm}
      onFinish={onUpload}
      layout="vertical"
      style={{ padding: "20px 0" }}
    >
      <Form.Item
        label={<Typography.Text strong>Entry Name</Typography.Text>}
        name="entryName"
        initialValue={entryName}
        style={{ marginBottom: "24px" }}
      >
        {isItemView ? (
          <Input disabled />
        ) : (
          <Select
            showSearch
            placeholder="Select or enter entry name"
            defaultValue={entryName}
            style={{ width: "100%" }}
            options={availableEntries.map((entry) => ({ value: entry }))}
          />
        )}
      </Form.Item>

      <Form.Item style={{ marginBottom: "24px" }}>
        <Upload.Dragger
          beforeUpload={(file) => {
            const maxSize = 1 * 1000 * 1000 * 1000; // 1GB
            if (file.size > maxSize) {
              setUploadError(
                `File size must be smaller than ${maxSize / (1000 * 1000 * 1000)}GB`,
              );
              return false;
            }
            setUploadError("");
            handleFileChange(file);
            return false;
          }}
          maxCount={1}
          style={{ padding: "24px" }}
        >
          <p className="ant-upload-drag-icon" style={{ fontSize: "32px" }}>
            <UploadOutlined />
          </p>
          <p
            className="ant-upload-text"
            style={{ fontSize: "16px", margin: "16px 0 8px" }}
          >
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint" style={{ color: "#666" }}>
            Maximum file size: 1GB
          </p>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Content Type</Typography.Text>}
        name="contentType"
        style={{ marginBottom: "24px" }}
      >
        <Input
          placeholder="Enter content type (optional)"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
        />
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Timestamp</Typography.Text>}
        name="timestamp"
        style={{ marginBottom: "24px" }}
      >
        <DatePicker
          showTime
          style={{ width: "100%" }}
          placeholder="Select date and time (optional)"
        />
      </Form.Item>

      <div style={{ marginBottom: "24px" }}>
        <Typography.Text
          strong
          style={{ display: "block", marginBottom: "16px" }}
        >
          Labels
        </Typography.Text>
        {labels.map((label, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
              background: "#f5f5f5",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <Input
              placeholder="Key"
              value={label.key}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].key = e.target.value;
                setLabels(newLabels);
              }}
              style={{ flex: 1 }}
            />
            <Input
              placeholder="Value"
              value={label.value}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].value = e.target.value;
                setLabels(newLabels);
              }}
              style={{ flex: 1 }}
            />
            <Button
              onClick={() => setLabels(labels.filter((_, i) => i !== index))}
              danger
              icon={<DeleteOutlined />}
            />
          </div>
        ))}
        <Button
          type="dashed"
          onClick={() => setLabels([...labels, { key: "", value: "" }])}
          icon={<PlusOutlined />}
          style={{ width: "100%", marginTop: "8px" }}
        >
          Add Label
        </Button>
      </div>

      {uploadError && (
        <Alert
          type="error"
          message={uploadError}
          style={{ marginBottom: "24px" }}
          showIcon
        />
      )}

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          icon={<UploadOutlined />}
          loading={isUploadLoading}
        >
          Upload File
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UploadFileForm;
