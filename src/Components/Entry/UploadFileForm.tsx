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
import { APIError, Client } from "reduct-js";
import { Buffer } from "buffer";
import "./UploadFileForm.css";

interface UploadFileFormProps {
  client: Client;
  bucketName: string;
  entryName: string;
  permissions?: any;
  availableEntries: string[];
  onUploadSuccess: () => void;
}

const UploadFileForm: React.FC<UploadFileFormProps> = ({
  client,
  bucketName,
  entryName,
  permissions,
  availableEntries,
  onUploadSuccess,
}) => {
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  const handleUpload = async (values: any) => {
    setIsUploadLoading(true);

    // Validate label keys before proceeding
    const invalidLabels = labels.filter(
      (label) => !/^[a-zA-Z0-9_-]+$/.test(label.key),
    );
    if (invalidLabels.length > 0) {
      setUploadError(
        `Invalid label: ${invalidLabels.map((label) => label.key).join(", ")}. Keys must be alphanumeric and can include underscores or hyphens.`,
      );
      setIsUploadLoading(false);
      return;
    }

    try {
      // Interact with the database
      const bucket = await client.getBucket(bucketName);
      await bucket.getInfo();

      const arrayBuffer = await uploadFile!.arrayBuffer();
      const writer = await bucket.beginWrite(values.entryName, {
        contentType:
          values.contentType || uploadFile!.type || "application/octet-stream",
        labels: labels.reduce(
          (acc, label) => ({ ...acc, [label.key.trim()]: label.value }),
          {},
        ),
      });

      const buffer = Buffer.from(arrayBuffer);
      await writer.write(buffer);

      onUploadSuccess();
      uploadForm.resetFields();
      setUploadFile(null);
      setLabels([]);
    } catch (error) {
      if (error instanceof APIError) {
        setUploadError(error.message || "An unknown error occurred.");
      } else {
        setUploadError(
          "Failed to upload file. Please check your connection and try again.",
        );
      }
    } finally {
      setIsUploadLoading(false);
    }
  };

  const handleFileChange = (info: any) => {
    const newFileList = info.fileList.slice(-1); // Keep only the latest file
    setFileList(newFileList);
    setUploadFile(newFileList.length > 0 ? newFileList[0].originFileObj : null);
  };

  return (
    <Form
      form={uploadForm}
      onFinish={handleUpload}
      layout="vertical"
      className="upload-form"
    >
      <Form.Item
        label={<Typography.Text strong>Entry Name</Typography.Text>}
        name="entryName"
        initialValue={entryName}
        className="form-item"
      >
        <Select
          showSearch
          placeholder="Select or enter entry name"
          defaultValue={entryName}
          className="select-entry"
          options={availableEntries.map((entry) => ({ value: entry }))}
        />
      </Form.Item>

      <Form.Item className="form-item">
        <Upload.Dragger
          beforeUpload={() => false}
          fileList={fileList}
          onChange={handleFileChange}
          showUploadList={{
            showRemoveIcon: true,
            removeIcon: <DeleteOutlined />,
          }}
          className="upload-dragger"
        >
          <p className="ant-upload-drag-icon upload-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text upload-text">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint upload-hint">Maximum file size: 1GB</p>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Content Type</Typography.Text>}
        name="contentType"
        className="form-item"
      >
        <Input placeholder="Enter content type (optional)" />
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Timestamp</Typography.Text>}
        name="timestamp"
        className="form-item"
      >
        <DatePicker
          showTime
          className="date-picker"
          placeholder="Select date and time (optional)"
        />
      </Form.Item>

      <div className="labels-section">
        <Typography.Text strong className="labels-title">
          Labels
        </Typography.Text>
        {labels.map((label, index) => (
          <div key={index} className="label-item">
            <Input
              placeholder="Key"
              value={label.key}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].key = e.target.value;
                setLabels(newLabels);
              }}
              className="label-input"
            />
            <Input
              placeholder="Value"
              value={label.value}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].value = e.target.value;
                setLabels(newLabels);
              }}
              className="label-input"
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
          className="add-label-button"
        >
          Add Label
        </Button>
      </div>

      {uploadError && (
        <Alert
          type="error"
          message={uploadError}
          className="upload-error"
          showIcon
        />
      )}

      <Form.Item className="form-item">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          icon={<UploadOutlined />}
          loading={isUploadLoading}
          disabled={!uploadFile}
          className="upload-button"
        >
          Upload File
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UploadFileForm;
