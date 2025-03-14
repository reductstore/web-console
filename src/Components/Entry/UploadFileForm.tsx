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
  availableEntries: string[];
  onUploadSuccess: () => void;
}

const UploadFileForm: React.FC<UploadFileFormProps> = ({
  client,
  bucketName,
  entryName,
  availableEntries,
  onUploadSuccess,
}) => {
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [timestamp, setTimestamp] = useState<Date | null>(null);

  const resetForm = () => {
    uploadForm.resetFields();
    setUploadFile(null);
    setLabels([]);
    setUploadError("");
    setFileList([]);
    setTimestamp(null);
  };

  const handleUpload = async (values: any) => {
    setIsUploadLoading(true);

    const invalidLabels = labels.filter(
      (label) => !/^[a-zA-Z0-9_-]+$/.test(label.key),
    );
    if (invalidLabels.length > 0) {
      setUploadError(
        `Invalid label key(s): ${invalidLabels.map((label) => label.key).join(", ")}. Keys must be alphanumeric and can include underscores or hyphens.`,
      );
      setIsUploadLoading(false);
      return;
    }

    if (!uploadFile) {
      setUploadError("Please select a file.");
      setIsUploadLoading(false);
      return;
    }

    try {
      const bucket = await client.getBucket(bucketName);
      await bucket.getInfo();

      const arrayBuffer = await uploadFile.arrayBuffer();
      const writer = await bucket.beginWrite(values.entryName, {
        contentType:
          values.contentType || uploadFile.type || "application/octet-stream",
        labels: labels.reduce(
          (acc, label) => ({ ...acc, [label.key.trim()]: label.value }),
          {},
        ),
        ts: BigInt((timestamp ? timestamp.getTime() : Date.now()) * 1000),
      });

      const buffer = Buffer.from(arrayBuffer);
      await writer.write(buffer);

      onUploadSuccess();
      resetForm();
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
    const newFileList = info.fileList.slice(-1);
    setFileList(newFileList);
    setUploadFile(newFileList.length > 0 ? newFileList[0].originFileObj : null);
  };

  return (
    <Form
      form={uploadForm}
      onFinish={handleUpload}
      layout="vertical"
      className="uploadForm"
    >
      <Form.Item
        label={<Typography.Text strong>Entry Name</Typography.Text>}
        name="entryName"
        initialValue={entryName}
        className="formItem"
      >
        <Select
          showSearch
          placeholder="Select or enter entry name"
          defaultValue={entryName}
          className="selectEntry"
          options={availableEntries.map((entry) => ({ value: entry }))}
          disabled={true}
        />
      </Form.Item>

      <Form.Item className="formItem">
        <Upload.Dragger
          beforeUpload={() => false}
          fileList={fileList}
          onChange={handleFileChange}
          showUploadList={{
            showRemoveIcon: true,
            removeIcon: <DeleteOutlined />,
          }}
          className="uploadDragger"
        >
          <p className="ant-upload-drag-icon uploadIcon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text uploadText">
            Click or drag file to this area to upload
          </p>
          <p className="ant-upload-hint uploadHint">Maximum file size: 1GB</p>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Content Type</Typography.Text>}
        name="contentType"
        className="formItem"
      >
        <Input placeholder="Enter content type (optional)" />
      </Form.Item>

      <Form.Item
        label={<Typography.Text strong>Timestamp</Typography.Text>}
        name="timestamp"
        className="formItem"
      >
        <DatePicker
          showTime
          className="datePicker"
          placeholder="Select date and time (optional)"
          onChange={(value) => setTimestamp(value ? value.toDate() : null)}
        />
      </Form.Item>

      <div className="labelsSection">
        <Typography.Text strong className="labelsTitle">
          Labels
        </Typography.Text>
        {labels.map((label, index) => (
          <div key={index} className="labelItem">
            <Input
              placeholder="Key"
              value={label.key}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].key = e.target.value;
                setLabels(newLabels);
              }}
              className="labelInput"
            />
            <Input
              placeholder="Value"
              value={label.value}
              onChange={(e) => {
                const newLabels = [...labels];
                newLabels[index].value = e.target.value;
                setLabels(newLabels);
              }}
              className="labelInput"
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
          className="addLabelButton"
        >
          Add Label
        </Button>
      </div>

      {uploadError && (
        <Alert
          type="error"
          message={uploadError}
          className="uploadError"
          showIcon
        />
      )}

      <Form.Item className="formItem">
        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          icon={<UploadOutlined />}
          loading={isUploadLoading}
          disabled={!uploadFile}
          className="uploadButton"
        >
          Upload File
        </Button>
      </Form.Item>
    </Form>
  );
};

export default UploadFileForm;
