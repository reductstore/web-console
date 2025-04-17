import React, { useState, useEffect } from "react";
// Add this to detect test environment
const isTestEnv = process.env.NODE_ENV === "test";
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
} from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { DownloadOutlined, EditOutlined } from "@ant-design/icons";
import { Controlled as CodeMirror } from "react-codemirror2";
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import UploadFileForm from "../../Components/Entry/UploadFileForm";

// @ts-ignore
import prettierBytes from "prettier-bytes";

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
  const [limit, setLimit] = useState<number | undefined>(10);
  const [showUnix, setShowUnix] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [whenCondition, setWhenCondition] = useState<string>("");
  const [whenError, setWhenError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isEditLabelsModalVisible, setIsEditLabelsModalVisible] =
    useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Force CodeMirror to refresh when modal becomes visible
  useEffect(() => {
    if (isEditLabelsModalVisible && !isTestEnv) {
      // Need to wait for modal animation to complete
      const timer = setTimeout(() => {
        setEditorKey((prev) => prev + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditLabelsModalVisible]);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [labelsJson, setLabelsJson] = useState("");
  const [labelUpdateError, setLabelUpdateError] = useState("");
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);

  // Provide a default value for permissions
  const permissions = props.permissions || { write: [], fullAccess: false };

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

  const handleEditLabels = (record: any) => {
    setCurrentRecord(record);

    // Format the labels exactly like the When Condition editor
    let labelsJson = "{}";

    if (record.labels) {
      try {
        // First convert to string if it's an object
        const labelsStr =
          typeof record.labels === "string"
            ? record.labels
            : JSON.stringify(record.labels);

        // Parse and reformat to ensure proper structure
        labelsJson = JSON.stringify(JSON.parse(labelsStr), null, 2);
      } catch (error) {
        console.error("Error formatting labels:", error);
        labelsJson = "{}"; // Default to empty object if error
      }
    }

    // Set it in the editor
    setLabelsJson(labelsJson);
    setLabelUpdateError("");
    setIsEditLabelsModalVisible(true);
  };

  const handleUpdateLabels = async () => {
    try {
      // Parse the JSON to validate it
      const labels = JSON.parse(labelsJson);
      setLabelUpdateError("");

      // Get the timestamp of the record to update
      const timestamp = BigInt(currentRecord.key);

      // Get the bucket
      const bucket = await props.client.getBucket(bucketName);

      try {
        // First check if record exists and get its current information
        const reader = await bucket.beginRead(entryName, timestamp, true); // true = head only (metadata)
        const oldLabels = reader.labels;

        // Add diagnostics info
        console.log("Updating record labels for:", timestamp.toString());
        console.log("Current labels:", oldLabels);
        console.log("New labels:", labels);

        // 1. Read the original record's full data
        const fullReader = await bucket.beginRead(entryName, timestamp);
        const recordData = await fullReader.read();
        const recordContentType = fullReader.contentType;

        // 2. Remove the old record
        await bucket.removeRecord(entryName, timestamp);

        // 3. Write a new record with the same timestamp but updated labels
        const writer = await bucket.beginWrite(entryName, {
          ts: timestamp,
          contentType: recordContentType,
          labels: labels,
        });

        // 4. Write the original data back
        await writer.write(recordData);
      } catch (error) {
        let errorMessage = "Failed to update labels";

        if (error instanceof APIError) {
          errorMessage = error.message || errorMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      }

      // Refresh the records to show updated labels
      getRecords(start, end, limit);
      setIsEditLabelsModalVisible(false);
    } catch (err) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setLabelUpdateError("Invalid JSON format: " + err.message);
      } else if (err instanceof APIError) {
        setLabelUpdateError(err.message || "API Error");
      } else if (err instanceof Error) {
        setLabelUpdateError(err.message || "Failed to update labels.");
      } else {
        setLabelUpdateError("Failed to update labels: " + String(err));
      }
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
      key: "actions",
      render: (text: any, record: any) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <DownloadOutlined
            onClick={() => handleDownload(record)}
            style={{ cursor: "pointer" }}
            title="Download record"
          />
          {hasWritePermission && (
            <EditOutlined
              onClick={() => handleEditLabels(record)}
              style={{ cursor: "pointer" }}
              title="Edit labels"
            />
          )}
        </div>
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
            getRecords(start, end, limit);
          }}
        />
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
        </div>
      </div>
      <Table columns={columns} dataSource={data} />

      {/* Modal for editing labels */}
      <Modal
        title="Edit Record Labels"
        open={isEditLabelsModalVisible}
        onCancel={() => setIsEditLabelsModalVisible(false)}
        onOk={handleUpdateLabels}
        okText="Update Labels"
        width={600}
      >
        {currentRecord && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Record Timestamp: </Typography.Text>
              <Typography.Text>
                {showUnix
                  ? currentRecord.key
                  : new Date(
                      Number(currentRecord.timestamp / 1000n),
                    ).toISOString()}
              </Typography.Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Content Type: </Typography.Text>
              <Typography.Text>{currentRecord.contentType}</Typography.Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Typography.Text strong>Size: </Typography.Text>
              <Typography.Text>{currentRecord.size}</Typography.Text>
            </div>
            <Typography.Text>Edit Labels (JSON format):</Typography.Text>
            <div style={{ marginBottom: 8 }}>
              <Typography.Text type="secondary" style={{ fontSize: "0.85em" }}>
                Note: To remove a label, remove the key-value pair from the JSON
              </Typography.Text>
            </div>
            <div className="jsonFilterSection">
              <CodeMirror
                key={`editor-${editorKey}`}
                className="jsonEditor"
                value={labelsJson}
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
                  setLabelsJson(value);
                }}
                onBlur={(editor: any) => {
                  const value = editor.getValue() || "";
                  setLabelsJson(formatJSON(value));
                }}
              />
            </div>
            {labelUpdateError && (
              <Alert
                type="error"
                message={labelUpdateError}
                style={{ marginTop: 16 }}
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
