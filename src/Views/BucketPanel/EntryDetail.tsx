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
  Button,
  Input,
  Select,
  Alert,
  Modal,
  Space,
  message,
  Spin,
} from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import {
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Controlled as CodeMirror } from "react-codemirror2";
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import UploadFileForm from "../../Components/Entry/UploadFileForm";
import EditRecordLabelsModal from "../../Components/EditRecordLabelsModal";
import streamSaver from "streamsaver";
import { getExtensionFromContentType } from "../../Helpers/contentType";
import dayjs from "dayjs";

// @ts-ignore
import prettierBytes from "prettier-bytes";
import TimeRangeDropdown from "../../Components/Entry/TimeRangeDropdown";

// Define CustomPermissions to match TokenPermissions
interface CustomPermissions {
  write?: string[];
  fullAccess: boolean;
}

interface Props {
  client: Client;
  permissions?: CustomPermissions;
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

  const [showUnix, setShowUnix] = useState(false);
  const [startText, setStartText] = useState<string>("");
  const [stopText, setStopText] = useState<string>("");
  const [startError, setStartError] = useState(false);
  const [stopError, setStopError] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [whenCondition, setWhenCondition] = useState<string>(
    '{\n  "$limit": 10\n}',
  );
  const [whenError, setWhenError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isEditLabelsModalVisible, setIsEditLabelsModalVisible] =
    useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Provide a default value for permissions
  const permissions = props.permissions || { write: [], fullAccess: false };

  const getRecords = async (start?: bigint, end?: bigint) => {
    setIsLoading(true);
    setRecords([]);
    setWhenError("");
    try {
      const bucket = await props.client.getBucket(bucketName);
      const options = new QueryOptions();
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
      getRecords(start, end);
    }
  };

  const handleDownload = async (record: any) => {
    if (downloadingKey !== null) return;
    setDownloadingKey(record.key);

    try {
      const bucket = await props.client.getBucket(bucketName);
      const readableRecord = await bucket.beginRead(
        entryName,
        BigInt(record.key),
      );
      const ext = getExtensionFromContentType(record.contentType || "");
      const fileName = `${entryName}-${record.key}${ext}`;
      const size = Number(readableRecord.size);
      if (size < 1024 * 1024) {
        // Small file: use Blob and anchor
        const data = await readableRecord.read();
        const blob = new Blob([data], { type: record.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Large file: stream to disk
        const fileStream = streamSaver.createWriteStream(fileName, { size });
        await readableRecord.stream.pipeTo(fileStream);
      }
    } catch (err) {
      console.error("Download failed", err);
      message.error("Failed to download record");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleDeleteClick = (record: any) => {
    setRecordToDelete(record);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      setIsLoading(true);
      const bucket = await props.client.getBucket(bucketName);
      await bucket.removeRecord(entryName, BigInt(recordToDelete.key));
      message.success("Record deleted successfully");
      setIsDeleteModalVisible(false);
      getRecords(start, end);
    } catch (err) {
      console.error(err);
      message.error("Failed to delete record");
      setIsLoading(false);
    }
  };

  const handleEditLabels = (record: any) => {
    setCurrentRecord(record);
    setIsEditLabelsModalVisible(true);
  };

  const handleLabelsUpdated = async (
    newLabels: Record<string, string>,
    timestamp: bigint,
  ) => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      await bucket.update(entryName, timestamp, newLabels);

      getRecords(start, end);
      message.success("Record labels updated successfully");
    } catch (err) {
      console.error("Failed to update labels:", err);
      if (err instanceof APIError) {
        message.error(err.message || "API Error");
      } else {
        message.error("Failed to update record labels");
      }
    }
  };

  const formatValue = (val: bigint | undefined, unix: boolean): string => {
    if (val === undefined) return "";
    return unix ? val.toString() : new Date(Number(val / 1000n)).toISOString();
  };

  const handleFormatChange = (value: string) => {
    const unix = value === "Unix";
    setShowUnix(unix);
    setStartText(formatValue(start, unix));
    setStopText(formatValue(end, unix));
  };

  const parseInput = (
    value: string,
    setter: (v: bigint | undefined) => void,
    errSetter: (v: boolean) => void,
  ) => {
    if (!value) {
      setter(undefined);
      errSetter(false);
      return;
    }

    if (showUnix) {
      try {
        const v = BigInt(value);
        setter(v);
        errSetter(false);
      } catch {
        setter(undefined);
        errSetter(true);
      }
    } else {
      const d = dayjs(value);
      if (d.isValid()) {
        setter(BigInt(d.valueOf() * 1000));
        errSetter(false);
      } else {
        setter(undefined);
        errSetter(true);
      }
    }
  };

  const getEntryInfo = async () => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      const entries = await bucket.getEntryList();
      setAvailableEntries(entries.map((e) => e.name));
      const entry = entries.find((e) => e.name === entryName);
      if (entry) {
        setEntryInfo(entry);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getEntryInfo();
  }, []);

  useEffect(() => {
    getRecords(start, end);
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
      title: "Actions",
      key: "actions",
      render: (text: any, record: any) => (
        <Space size="middle">
          {downloadingKey === record.key ? (
            <Spin size="small" style={{ marginRight: 8 }} />
          ) : (
            <DownloadOutlined
              onClick={() => handleDownload(record)}
              style={{ cursor: "pointer" }}
              title="Download record"
            />
          )}
          {hasWritePermission && (
            <EditOutlined
              onClick={() => handleEditLabels(record)}
              style={{ cursor: "pointer" }}
              title="Edit labels"
            />
          )}
          {hasWritePermission && (
            <DeleteOutlined
              onClick={() => handleDeleteClick(record)}
              style={{ cursor: "pointer", color: "#ff4d4f" }}
              title="Delete record"
            />
          )}
        </Space>
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

  // Format JSON exactly like in the When Condition component
  const formatJSON = (jsonString: string): string => {
    if (!jsonString) return "{}";

    try {
      // Parse and re-stringify to ensure proper formatting
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  const hasWritePermission =
    permissions.fullAccess ||
    (permissions.write && permissions.write.includes(bucketName));

  return (
    <div className="entryDetail">
      {entryInfo && (
        <EntryCard
          entryInfo={entryInfo}
          bucketName={bucketName}
          permissions={permissions as TokenPermissions}
          showUnix={showUnix}
          client={props.client}
          onRemoved={() => history.push(`/buckets/${bucketName}`)}
          onUpload={() => setIsUploadModalVisible(true)}
          hasWritePermission={hasWritePermission}
        />
      )}
      <Modal
        title="Upload File"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <UploadFileForm
          client={props.client}
          bucketName={bucketName}
          entryName={entryName}
          availableEntries={availableEntries}
          onUploadSuccess={() => {
            setIsUploadModalVisible(false);
            getRecords(start, end);
          }}
        />
      </Modal>

      <Modal
        title="Delete Record"
        open={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        onOk={handleDeleteRecord}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
        centered
      >
        <Typography.Paragraph>
          Are you sure you want to delete this record? This action cannot be
          undone.
        </Typography.Paragraph>
        {recordToDelete && (
          <div>
            <Typography.Text strong>Timestamp: </Typography.Text>
            <Typography.Text>
              {showUnix
                ? recordToDelete.key
                : new Date(
                    Number(recordToDelete.timestamp / 1000n),
                  ).toISOString()}
            </Typography.Text>
          </div>
        )}
      </Modal>

      <Typography.Title level={3}>Records</Typography.Title>
      <div className="detailControls">
        <div className="displayFormat">
          <Typography.Text strong>Display format</Typography.Text>
          <Select
            data-testid="format-select"
            value={showUnix ? "Unix" : "UTC"}
            onChange={handleFormatChange}
            className="formatSelect"
          >
            <Select.Option value="UTC">UTC</Select.Option>
            <Select.Option value="Unix">Unix</Select.Option>
          </Select>
        </div>
        <div className="timeInputs">
          <Typography.Text strong>Time range</Typography.Text>
          <Input
            placeholder="Start time (optional)"
            addonBefore="Start"
            value={startText}
            onChange={(e) => {
              setStartText(e.target.value);
              parseInput(e.target.value, setStart, setStartError);
            }}
            status={startError ? "error" : undefined}
          />
          <Input
            placeholder="Stop time (optional)"
            addonBefore="Stop"
            value={stopText}
            onChange={(e) => {
              setStopText(e.target.value);
              parseInput(e.target.value, setEnd, setStopError);
            }}
            status={stopError ? "error" : undefined}
          />
          <TimeRangeDropdown
            onSelectRange={(start, end) => {
              setStart(start);
              setEnd(end);
              setStartText(formatValue(start, showUnix));
              setStopText(formatValue(end, showUnix));
              setStartError(false);
              setStopError(false);
            }}
          />
        </div>
        <div className="jsonFilterSection">
          <Typography.Text strong>Record filter</Typography.Text>
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
            onBeforeChange={(editor: any, data: any, value: string) => {
              setWhenCondition(value);
            }}
            onBlur={(editor: any) => {
              const value = editor.getValue() || "";
              setWhenCondition(formatJSON(value));
            }}
          />
          {whenError && <Alert type="error" message={whenError} />}
          <Typography.Text type="secondary" className="jsonExample">
            {'Example: {"&label_name": { "$gt": 10 }, "$limit": 10 }'}
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
        </div>
      </div>
      <Table columns={columns} dataSource={data} />

      {/* Modal for editing labels */}
      <EditRecordLabelsModal
        isVisible={isEditLabelsModalVisible}
        onCancel={() => setIsEditLabelsModalVisible(false)}
        record={currentRecord}
        showUnix={showUnix}
        onLabelsUpdated={handleLabelsUpdated}
      />
    </div>
  );
}
