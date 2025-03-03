import React, { useState, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  APIError,
  Client,
  EntryInfo,
  QueryOptions,
  TokenPermissions,
} from "reduct-js";
import {
  Table,
  Typography,
  DatePicker,
  Button,
  InputNumber,
  Checkbox,
  Alert,
  Modal,
  Upload,
  Form,
  Input,
} from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import {
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Controlled as CodeMirror } from "react-codemirror2";
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import { Buffer } from 'buffer';

// @ts-ignore
import prettierBytes from "prettier-bytes";
interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

export default function EntryDetail(props: Readonly<Props>) {
  const { bucketName, entryName } = useParams() as {
    bucketName: string;
    entryName: string;
  };
  const history = useHistory();
  const [records, setRecords] = useState<ReadableRecord[]>([]);
  const [start, setStart] = useState<bigint | undefined>(undefined);
  const [end, setEnd] = useState<bigint | undefined>(undefined);
  const [limit, setLimit] = useState<number | undefined>(10);
  const [showUnix, setShowUnix] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [whenCondition, setWhenCondition] = useState<string>("");
  const [whenError, setWhenError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);

  const getRecords = async (start?: bigint, end?: bigint, limit?: number) => {
    setIsLoading(true);
    setRecords([]);
    setWhenError("");
    try {
      const bucket = await props.client.getBucket(bucketName);
      const options = new QueryOptions();
      options.limit = limit;
      options.head = true;
      options.strict = true;
      if (whenCondition.trim()) options.when = JSON.parse(whenCondition);
      for await (const record of bucket.query(entryName, start, end, options)) {
        setRecords((records) => [...records, record]);
      }
    } catch (err) {
      if (err instanceof APIError && err.message) setWhenError(err.message);
      else if (err instanceof SyntaxError) setWhenError(err.message);
      else setWhenError("Failed to fetch records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchRecordsClick = () => {
    if (!isLoading) {
      getRecords(start, end, limit);
    }
  };

  const handleDownload = async (record: any) => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      const data = await (
        await bucket.beginRead(entryName, BigInt(record.key))
      ).read();
      const blob = new Blob([data], { type: record.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entryName}-${record.key}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (dates: any) => {
    if (dates) {
      const startDate = dates[0].toDate();
      const endDate = dates[1].toDate();
      const startTimestamp =
        startDate.getTime() - startDate.getTimezoneOffset() * 60000;
      const endTimestamp =
        endDate.getTime() - endDate.getTimezoneOffset() * 60000;
      setStart(BigInt(startTimestamp) * 1000n);
      setEnd(BigInt(endTimestamp) * 1000n);
    } else {
      setStart(undefined);
      setEnd(undefined);
    }
  };

  const getEntryInfo = async () => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      const entries = await bucket.getEntryList();
      const entry = entries.find((e) => e.name === entryName);
      if (entry) {
        setEntryInfo(entry);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (values: any) => {
    setIsUploadLoading(true);
    try {
      if (!uploadFile) {
        throw new Error("Please select a file to upload");
      }

      // Check write permissions
      if (!props.permissions?.write) {
        throw new Error("You don't have permission to write to this bucket. Please check your token permissions.");
      }

      // First verify we can connect to the bucket
      try {
        const bucket = await props.client.getBucket(bucketName);
        
        // Verify bucket is accessible
        await bucket.getInfo();
      } catch (error) {
        const connError = error as Error;
        throw new Error(`Cannot connect to bucket: ${connError.message}`);
      }

      const bucket = await props.client.getBucket(bucketName);
      
      // Read the file as an ArrayBuffer for binary data
      const arrayBuffer = await uploadFile.arrayBuffer();
      
      const writer = await bucket.beginWrite(entryName, {
        contentType: uploadFile.type || "application/octet-stream",
        labels: labels.reduce((acc, label) => ({
          ...acc,
          [label.key.trim()]: label.value
        }), {})
      });

      try {
        // Convert Uint8Array to Buffer
        const buffer = Buffer.from(arrayBuffer);

        // Write the binary data
        await writer.write(buffer);

        setIsUploadModalVisible(false);
        uploadForm.resetFields();
        setUploadFile(null);
        setLabels([]);
        
        // Add a small delay before refreshing
        setTimeout(() => {
          getRecords(start, end, limit);
        }, 1000);
        
      } catch (error) {
        const writeError = error as Error;
        console.log('Write error:', writeError);
        throw new Error(`Failed to write file: ${writeError.message}`);
      }
    } catch (error) {
      const err = error as Error;
      console.log('Upload error:', err);
      setUploadError(err.message || "Failed to upload file. Please check your connection and try again.");
    } finally {
      setIsUploadLoading(false);
    }
  };

  useEffect(() => {
    // Verify connection when component mounts
    const verifyConnection = async () => {
      try {
        await props.client.getInfo();
        console.log('Successfully connected to Reduct Store');
      } catch (err) {
        console.log('Failed to connect to Reduct Store:', err);
        setUploadError('Cannot connect to storage server. Please check your connection.');
      }
    };
    
    verifyConnection();
    getEntryInfo();
    getRecords(start, end, limit);
  }, [bucketName, entryName]);

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (text: any, record: any) =>
        showUnix
          ? record.key
          : new Date(Number(record.timestamp / 1000n)).toISOString(),
    },
    { title: "Size", dataIndex: "size", key: "size" },
    { title: "Content Type", dataIndex: "contentType", key: "contentType" },
    { title: "Labels", dataIndex: "labels", key: "labels" },
    {
      title: "",
      key: "download",
      render: (text: any, record: any) => (
        <DownloadOutlined
          onClick={() => handleDownload(record)}
          style={{ cursor: "pointer" }}
        />
      ),
    },
  ];

  const data = records.map((record) => ({
    key: record.time.toString(),
    timestamp: record.time,
    size: prettierBytes(Number(record.size)),
    contentType: record.contentType,
    labels: JSON.stringify(record.labels, null, 2),
  }));

  const formatJSON = (jsonString: string): string => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div className="entryDetail">
      {entryInfo && (
        <EntryCard
          entryInfo={entryInfo}
          bucketName={bucketName}
          permissions={props.permissions}
          showUnix={showUnix}
          client={props.client}
          onRemoved={() => history.push(`/buckets/${bucketName}`)}
        />
      )}

      <Modal
        title="Upload File"
        open={isUploadModalVisible}
        onCancel={() => {
          setIsUploadModalVisible(false);
          setUploadError("");
          uploadForm.resetFields();
          setUploadFile(null);
          setLabels([]);
        }}
        footer={null}
        width={600}
      >
        <Form
          form={uploadForm}
          onFinish={handleUpload}
          layout="vertical"
          style={{ padding: '20px 0' }}
        >
          <Form.Item style={{ marginBottom: '24px' }}>
            <Upload.Dragger
              beforeUpload={(file) => {
                // Add file size check (e.g., 10MB limit)
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                  setUploadError(`File size must be smaller than ${maxSize / (1024 * 1024)}MB`);
                  return false;
                }
                setUploadError('');
                setUploadFile(file);
                return false;
              }}
              maxCount={1}
              style={{ padding: '24px' }}
            >
              <p className="ant-upload-drag-icon" style={{ fontSize: '32px' }}>
                <UploadOutlined />
              </p>
              <p className="ant-upload-text" style={{ fontSize: '16px', margin: '16px 0 8px' }}>
                Click or drag file to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ color: '#666' }}>
                Maximum file size: 10MB
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item 
            label={<Typography.Text strong>Timestamp</Typography.Text>} 
            name="timestamp"
            style={{ marginBottom: '24px' }}
          >
            <DatePicker 
              showTime 
              style={{ width: '100%' }}
              placeholder="Select date and time (optional)"
            />
          </Form.Item>

          <div style={{ marginBottom: '24px' }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: '16px' }}>
              Labels
            </Typography.Text>
            {labels.map((label, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginBottom: '12px',
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '6px'
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
              onClick={() => setLabels([...labels, { key: '', value: '' }])}
              icon={<PlusOutlined />}
              style={{ width: '100%', marginTop: '8px' }}
            >
              Add Label
            </Button>
          </div>

          {uploadError && (
            <Alert 
              type="error" 
              message={uploadError} 
              style={{ marginBottom: '24px' }}
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
      </Modal>

      <Typography.Title level={3}>Records</Typography.Title>
      <Checkbox onChange={(e) => setShowUnix(e.target.checked)}>
        Unix Timestamp
      </Checkbox>
      <div className="detailControls">
        <div className="timeInputs">
          {showUnix ? (
            <>
              <InputNumber
                placeholder="Start Time (Unix)"
                onChange={(value) =>
                  setStart(value ? BigInt(value) : undefined)
                }
                className="timeInput"
                max={Number(end)}
              />
              <InputNumber
                placeholder="End Time (Unix)"
                onChange={(value) => setEnd(value ? BigInt(value) : undefined)}
                className="timeInput"
                min={Number(start)}
              />
            </>
          ) : (
            <DatePicker.RangePicker
              showTime
              placeholder={["Start Time (UTC)", "End Time (UTC)"]}
              onChange={handleDateChange}
              className="datePicker"
            />
          )}
          <InputNumber
            min={1}
            addonBefore="Limit"
            onChange={(value) => setLimit(value ? Number(value) : undefined)}
            className="limitInput"
            defaultValue={limit}
          />
        </div>
        <div className="jsonFilterSection">
          <Typography.Text>Filter Records (JSON):</Typography.Text>
          <CodeMirror
            className="jsonEditor"
            value={whenCondition}
            options={{
              mode: { name: "javascript", json: true },
              theme: "default",
              lineNumbers: true,
              lineWrapping: true,
              viewportMargin: Infinity,
              matchBrackets: true,
              autoCloseBrackets: true,
            }}
            onBeforeChange={(editor, data, value) => {
              setWhenCondition(value);
            }}
            onBlur={(editor) => {
              setWhenCondition(formatJSON(editor.getValue()));
            }}
          />
          {whenError && <Alert type="error" message={whenError} />}
          <Typography.Text type="secondary" className="jsonExample">
            {'Example: {"&label_name": { "$gt": 10 }}'}
            <br />
            <a
              href="https://www.reduct.store/docs/conditional-query"
              target="_blank"
              rel="noopener noreferrer"
            >
              Query Reference Documentation
            </a>
          </Typography.Text>
        </div>
        <div className="fetchButton">
          <Button onClick={handleFetchRecordsClick} type="primary">
            Fetch Records
          </Button>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => setIsUploadModalVisible(true)}
            style={{ marginLeft: '8px' }}
            disabled={!props.permissions?.write}
            title={!props.permissions?.write ? "You don't have write permissions" : undefined}
          >
            Upload File
          </Button>
        </div>
      </div>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
