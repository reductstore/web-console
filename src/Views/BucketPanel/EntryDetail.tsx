import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  APIError,
  Client,
  EntryInfo,
  QueryOptions,
  TokenPermissions,
} from "reduct-js";
import {
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
  ShareAltOutlined,
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

// @ts-ignore
import prettierBytes from "prettier-bytes";
import TimeRangeDropdown from "../../Components/Entry/TimeRangeDropdown";
import ScrollableTable from "../../Components/ScrollableTable";
import ShareLinkModal from "../../Components/ShareLinkModal";
import DataVolumeChart from "../../Components/Entry/DataVolumeChart";
import dayjs from "../../Helpers/dayjsConfig";
import {
  getDefaultTimeRange,
  DEFAULT_RANGE_KEY,
} from "../../Helpers/timeRangeUtils";
import { formatValue } from "../../Helpers/timeFormatUtils";
import { pickEachTInterval } from "../../Helpers/chartUtils";

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
  const [filteredRecords, setFilteredRecords] = useState<ReadableRecord[]>([]);

  const defaultRange = useMemo(() => {
    return getDefaultTimeRange();
  }, []);

  const [timeRange, setTimeRangeState] = useState(() => ({
    start: defaultRange.start as bigint | undefined,
    end: defaultRange.end as bigint | undefined,
    isCustomRange: false,
    startText: formatValue(defaultRange.start, false),
    stopText: formatValue(defaultRange.end, false),
  }));

  const [showUnix, setShowUnix] = useState(false);

  const setTimeRange = (
    start: bigint | undefined,
    end: bigint | undefined,
    isCustomRange = false,
  ) => {
    setTimeRangeState({
      start,
      end,
      isCustomRange,
      startText: formatValue(start, showUnix),
      stopText: formatValue(end, showUnix),
    });

    try {
      const currentCondition = JSON.parse(whenCondition.trim() || "{}");
      const keys = Object.keys(currentCondition);
      if (keys.length === 0 || (keys.length === 1 && keys[0] === "$each_t")) {
        const rangeMs =
          start && end
            ? Number((end - start) / 1000n)
            : Number((defaultRange.end - defaultRange.start) / 1000n);
        const eachTValue = pickEachTInterval(rangeMs);

        if (eachTValue) {
          const newCondition =
            JSON.stringify({ $each_t: eachTValue }, null, 2) + "\n";
          setWhenCondition(newCondition);
        } else {
          setWhenCondition("{}\n");
        }
      }
    } catch {
      // If current condition is not valid JSON, don't auto-update
    }
  };

  const updateTimeRangeText = (
    field: "startText" | "stopText",
    value: string,
  ) => {
    setTimeRangeState((prev) => ({
      ...prev,
      [field]: value,
      isCustomRange: true,
    }));
  };

  const [startError, setStartError] = useState(false);
  const [stopError, setStopError] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [whenCondition, setWhenCondition] = useState<string>(() => {
    const rangeMs = Number((defaultRange.end - defaultRange.start) / 1000n);
    const eachTValue = pickEachTInterval(rangeMs);

    if (eachTValue) {
      return JSON.stringify({ $each_t: eachTValue }, null, 2) + "\n";
    } else {
      return "{}\n";
    }
  });

  const [whenError, setWhenError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isEditLabelsModalVisible, setIsEditLabelsModalVisible] =
    useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [recordToShare, setRecordToShare] = useState<any>(null);

  // Provide a default value for permissions
  const permissions = props.permissions || { write: [], fullAccess: false };

  let latestRequestId = 0;
  const getRecords = async (start?: bigint, end?: bigint) => {
    const requestId = ++latestRequestId;

    setIsLoading(true);
    setWhenError("");
    setRecords([]);

    try {
      const bucket = await props.client.getBucket(bucketName);

      const options = new QueryOptions();
      options.head = true;
      options.strict = true;
      if (whenCondition.trim()) options.when = JSON.parse(whenCondition);

      let batch: ReadableRecord[] = [];
      let i = 0;

      for await (const record of bucket.query(entryName, start, end, options)) {
        if (requestId !== latestRequestId) return;

        batch.push(record);
        i++;

        // refresh table and chart every 10 records
        if (i % 20 === 0) {
          setRecords((prev) => [...prev, ...batch]);
          batch = [];
        }
      }
      if (batch.length) {
        if (requestId !== latestRequestId) return;
        setRecords((prev) => [...prev, ...batch]);
      }
    } catch (err) {
      if (err instanceof APIError && err.message) setWhenError(err.message);
      else if (err instanceof SyntaxError) setWhenError(err.message);
      else setWhenError("Failed to fetch records.");
    } finally {
      if (requestId === latestRequestId) setIsLoading(false);
    }
  };

  const handleFetchRecordsClick = () => {
    if (!isLoading) {
      getRecords(timeRange.start, timeRange.end);
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
        const blob = new Blob([data as BlobPart], { type: record.contentType });
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

  const handleShareClick = (record: any) => {
    setRecordToShare(record);
    setIsShareModalVisible(true);
  };

  const generateShareLink = async (
    expireAt: Date,
    fileName: string,
  ): Promise<string> => {
    const bucket = await props.client.getBucket(bucketName);
    return bucket.createQueryLink(
      entryName,
      BigInt(recordToShare.key),
      undefined,
      undefined,
      0,
      expireAt,
      fileName,
    );
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
      getRecords(timeRange.start, timeRange.end);
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

      getRecords(timeRange.start, timeRange.end);
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

  const handleFormatChange = (value: string) => {
    const unix = value === "Unix";
    setShowUnix(unix);
    setTimeRangeState((prev) => ({
      ...prev,
      startText: formatValue(prev.start, unix),
      stopText: formatValue(prev.end, unix),
    }));
  };

  const parseInput = (
    value: string,
    field: "start" | "end",
    errSetter: (v: boolean) => void,
  ) => {
    setTimeRangeState((prev) => ({ ...prev, isCustomRange: true }));

    if (!value) {
      const newStart = field === "start" ? undefined : timeRange.start;
      const newEnd = field === "end" ? undefined : timeRange.end;
      setTimeRangeState((prev) => ({
        ...prev,
        start: newStart,
        end: newEnd,
      }));
      errSetter(false);
      return;
    }

    if (showUnix) {
      try {
        const v = BigInt(value);
        const newStart = field === "start" ? v : timeRange.start;
        const newEnd = field === "end" ? v : timeRange.end;
        setTimeRangeState((prev) => ({
          ...prev,
          start: newStart,
          end: newEnd,
        }));
        errSetter(false);
      } catch {
        const newStart = field === "start" ? undefined : timeRange.start;
        const newEnd = field === "end" ? undefined : timeRange.end;
        setTimeRangeState((prev) => ({
          ...prev,
          start: newStart,
          end: newEnd,
        }));
        errSetter(true);
      }
    } else {
      const d = dayjs(value);
      if (d.isValid()) {
        const v = BigInt(d.valueOf()) * 1000n;
        const newStart = field === "start" ? v : timeRange.start;
        const newEnd = field === "end" ? v : timeRange.end;
        setTimeRangeState((prev) => ({
          ...prev,
          start: newStart,
          end: newEnd,
        }));
        errSetter(false);
      } else {
        const newStart = field === "start" ? undefined : timeRange.start;
        const newEnd = field === "end" ? undefined : timeRange.end;
        setTimeRangeState((prev) => ({
          ...prev,
          start: newStart,
          end: newEnd,
        }));
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
    getRecords(timeRange.start, timeRange.end);
  }, [bucketName, entryName]);

  useEffect(() => {
    const filtered = records.filter((record) => {
      if (timeRange.start !== undefined && record.time < timeRange.start)
        return false;
      if (timeRange.end !== undefined && record.time > timeRange.end)
        return false;
      return true;
    });
    setFilteredRecords(filtered);
  }, [records, timeRange.start, timeRange.end]);

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      fixed: "left",
      render: (text: any, record: any) =>
        showUnix
          ? record.key
          : dayjs(Number(record.timestamp / 1000n)).toISOString(),
    },
    { title: "Size", dataIndex: "size", key: "size" },
    { title: "Content Type", dataIndex: "contentType", key: "contentType" },
    {
      title: "Labels",
      dataIndex: "labels",
      key: "labels",
      render: (text: string) => {
        if (!text) return "-";

        let parsed: Record<string, unknown> | null = null;

        try {
          parsed = typeof text === "string" ? JSON.parse(text) : text;
        } catch {
          return (
            <div style={{ maxWidth: 400, wordBreak: "break-word" }}>{text}</div>
          );
        }

        if (!parsed || typeof parsed !== "object") return "-";

        const entries = Object.entries(parsed);
        if (entries.length === 0) return "-";

        const labelText = entries
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join(", ");

        return (
          <div style={{ maxWidth: 400, wordBreak: "break-word" }}>
            {labelText}
          </div>
        );
      },
    },
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
          <ShareAltOutlined
            onClick={() => handleShareClick(record)}
            style={{ cursor: "pointer" }}
            title="Share record"
          />
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

  const data = filteredRecords.map((record) => ({
    key: record.time.toString(),
    timestamp: record.time,
    size: prettierBytes(Number(record.size)),
    contentType: record.contentType,
    labels: JSON.stringify(record.labels, null, 2),
  }));

  // Format JSON exactly like in the When Condition component
  const formatJSON = (jsonString: string): string => {
    if (!jsonString) return "{}\n";

    try {
      // Parse and re-stringify to ensure proper formatting
      return JSON.stringify(JSON.parse(jsonString), null, 2) + "\n";
    } catch {
      return jsonString + "\n";
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
            getRecords(timeRange.start, timeRange.end);
          }}
        />
      </Modal>

      <Modal
        title="Delete Record"
        open={isDeleteModalVisible}
        centered
        footer={[
          <Button key="back" onClick={() => setIsDeleteModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="default"
            danger
            onClick={handleDeleteRecord}
          >
            Delete
          </Button>,
        ]}
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
        <div className="timeSelectSection">
          <div className="selectGroup">
            <Select
              data-testid="format-select"
              value={showUnix ? "Unix" : "UTC"}
              onChange={handleFormatChange}
            >
              <Select.Option value="UTC">UTC</Select.Option>
              <Select.Option value="Unix">Unix</Select.Option>
            </Select>
            <TimeRangeDropdown
              onSelectRange={(start, end) => {
                setTimeRange(start, end, false);
                setStartError(false);
                setStopError(false);
              }}
              initialRangeKey={DEFAULT_RANGE_KEY}
              currentRange={{ start: timeRange.start, end: timeRange.end }}
            />
          </div>

          <div className="timeInputs">
            <Input
              placeholder="Start time (optional)"
              addonBefore="Start"
              value={timeRange.startText}
              onChange={(e) => {
                updateTimeRangeText("startText", e.target.value);
                parseInput(e.target.value, "start", setStartError);
              }}
              status={startError ? "error" : undefined}
            />
            <Input
              placeholder="Stop time (optional)"
              addonBefore="Stop"
              value={timeRange.stopText}
              onChange={(e) => {
                updateTimeRangeText("stopText", e.target.value);
                parseInput(e.target.value, "end", setStopError);
              }}
              status={stopError ? "error" : undefined}
            />
          </div>
        </div>

        <div className="jsonFilterSection">
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
          {whenError && (
            <Alert type="error" message={whenError} style={{ marginTop: 8 }} />
          )}
          <Typography.Text type="secondary" className="jsonExample">
            Example: <code>{'{"&anomaly": { "$eq": 1 }}'}</code>
            Use <code>&label</code> for standard labels and <code>@label</code>{" "}
            for computed labels. Combine with operators like <code>$eq</code>,{" "}
            <code>$gt</code>, <code>$lt</code>, <code>$and</code>, etc. You can
            also use aggregation operators:
            <code>$each_n</code> (every N-th record) and <code>$each_t</code>{" "}
            (every N seconds) to control replication frequency.
            <br />
            <strong>
              <a
                href="https://www.reduct.store/docs/conditional-query"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Conditional Query Reference →
              </a>
            </strong>
          </Typography.Text>
        </div>
        <div className="fetchButton">
          <Button onClick={handleFetchRecordsClick} type="primary">
            Fetch Records
          </Button>
        </div>
      </div>
      <DataVolumeChart
        records={filteredRecords}
        setTimeRange={setTimeRange}
        startMs={
          timeRange.start !== undefined
            ? Number(timeRange.start / 1000n)
            : undefined
        }
        endMs={
          timeRange.end !== undefined
            ? Number(timeRange.end / 1000n)
            : undefined
        }
        isLoading={isLoading}
      />
      <ScrollableTable
        scroll={{ x: "max-content" }}
        columns={columns as any[]}
        dataSource={data}
      />

      {/* Modal for editing labels */}
      <EditRecordLabelsModal
        isVisible={isEditLabelsModalVisible}
        onCancel={() => setIsEditLabelsModalVisible(false)}
        record={currentRecord}
        showUnix={showUnix}
        onLabelsUpdated={handleLabelsUpdated}
      />

      {/* Modal for sharing links */}
      <ShareLinkModal
        open={isShareModalVisible}
        entryName={entryName}
        record={recordToShare}
        onGenerate={generateShareLink}
        onCancel={() => setIsShareModalVisible(false)}
      />
    </div>
  );
}
