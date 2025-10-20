import React, { useEffect, useMemo, useState, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
  APIError,
  Bucket,
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
  DeleteOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Controlled as CodeMirror } from "react-codemirror2";
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import UploadFileForm from "../../Components/Entry/UploadFileForm";

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
import { checkWritePermission } from "../../Helpers/permissionUtils";
import {
  extractIntervalFromCondition,
  formatAsStrictJSON,
  parseAndFormat,
  processWhenCondition,
} from "../../Helpers/json5Utils";
import EditRecordLabels from "../../Components/EditRecordLabels";
import RecordPreview from "../../Components/RecordPreview";

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

  const defaultRange = useMemo(() => {
    return getDefaultTimeRange();
  }, []);

  const [timeRange, setTimeRangeState] = useState(() => ({
    start: defaultRange.start as bigint | undefined,
    end: defaultRange.end as bigint | undefined,
    startText: formatValue(defaultRange.start, false),
    stopText: formatValue(defaultRange.end, false),
    interval: null as string | null,
  }));

  const [showUnix, setShowUnix] = useState(false);

  const setTimeRange = (
    start: bigint | undefined,
    end: bigint | undefined,
    interval?: string | null,
  ) => {
    setTimeRangeState((prev) => ({
      start,
      end,
      startText: formatValue(start, showUnix),
      stopText: formatValue(end, showUnix),
      interval: interval ?? prev.interval,
    }));
  };

  const updateTimeRangeText = (
    field: "startText" | "stopText",
    value: string,
  ) => {
    setTimeRangeState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const formatJSON = (jsonString?: string): string => {
    if (!jsonString) return formatAsStrictJSON({ $each_t: "$__interval" });

    const result = parseAndFormat(jsonString);
    if (result.error) {
      setWhenError(result.error);
      return jsonString;
    }

    if (whenError) {
      setWhenError("");
    }

    return result.formatted;
  };

  const [startError, setStartError] = useState(false);
  const [stopError, setStopError] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [whenCondition, setWhenCondition] = useState<string>(formatJSON());

  const [whenError, setWhenError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [recordToShare, setRecordToShare] = useState<any>(null);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  // Provide a default value for permissions
  const permissions = props.permissions || { write: [], fullAccess: false };

  const generateFileName = (recordKey: string, contentType: string): string => {
    const ext = getExtensionFromContentType(contentType || "");
    return `${entryName}-${recordKey}${ext}`;
  };

  const processConditionWithMacros = (
    conditionString: string,
    intervalValue: string,
  ): { success: boolean; processedCondition?: any; error?: string } => {
    if (!conditionString.trim()) {
      return { success: true, processedCondition: {} };
    }

    const result = processWhenCondition(conditionString, intervalValue);
    return {
      success: result.success,
      processedCondition: result.value,
      error: result.error,
    };
  };

  const getRecords = async (start?: bigint, end?: bigint) => {
    if (fetchCtrlRef.current) {
      fetchCtrlRef.current.abort();
    }

    fetchCtrlRef.current = new AbortController();
    const abortSignal = fetchCtrlRef.current.signal;

    setIsLoading(true);
    setWhenError("");
    setRecords([]);

    try {
      const bucketInstance = await props.client.getBucket(bucketName);
      setBucket(bucketInstance);

      const rangeStart = start ?? entryInfo?.oldestRecord;
      const rangeEnd = end ?? entryInfo?.latestRecord;

      const options = new QueryOptions();
      options.head = true;
      options.strict = true;

      if (whenCondition.trim()) {
        const macroValue = pickEachTInterval(rangeStart, rangeEnd);
        const conditionResult = processConditionWithMacros(
          whenCondition,
          macroValue,
        );

        if (!conditionResult.success) {
          setWhenError(conditionResult.error || "Invalid condition");
          setIsLoading(false);
          return;
        }

        const each_t = extractIntervalFromCondition(
          conditionResult.processedCondition,
        );
        setTimeRangeState((prev) => ({ ...prev, interval: each_t }));
        options.when = conditionResult.processedCondition;

        if (whenError) {
          setWhenError("");
        }
      }

      let batch: ReadableRecord[] = [];
      let count = 0;

      for await (const record of bucketInstance.query(
        entryName,
        rangeStart,
        rangeEnd,
        options,
      )) {
        if (abortSignal.aborted) return;
        batch.push(record);
        count++;

        // refresh components (table and chart) every 20 records
        if (count % 20 === 0) {
          setRecords((prev) => [...prev, ...batch]);
          batch = [];
        }
      }
      if (batch.length) {
        if (abortSignal.aborted) return;
        setRecords((prev) => [...prev, ...batch]);
      }
    } catch (err) {
      if (abortSignal.aborted) return;

      if (err instanceof APIError && err.message) setWhenError(err.message);
      else if (err instanceof SyntaxError) setWhenError(err.message);
      else setWhenError("Failed to fetch records.");
    } finally {
      if (!abortSignal.aborted) {
        setIsLoading(false);
        fetchCtrlRef.current = null;
      }
    }
  };

  const handleDownload = async (record: any) => {
    if (downloadingKey !== null) return;
    setDownloadingKey(record.key);

    try {
      const bucket = await props.client.getBucket(bucketName);
      const fileName = generateFileName(record.key, record.contentType);
      // Set expiration time for 1 hour from now
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      const shareLink = await bucket.createQueryLink(
        entryName,
        BigInt(record.key),
        undefined,
        undefined,
        0,
        expireAt,
        fileName,
      );
      const a = document.createElement("a");
      a.href = shareLink;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed", err);
      message.error("Failed to download record");
    } finally {
      // cannot track download completion, wait for 2 seconds
      setTimeout(() => {
        setDownloadingKey(null);
      }, 2000);
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

  const handleLabelsUpdated = async (
    newLabels: Record<string, string>,
    timestamp: bigint,
  ) => {
    try {
      const originalRecord = records.find((r) => r.time === timestamp);
      const originalLabels = originalRecord?.labels || {};
      const originalLabelsObj =
        typeof originalLabels === "string"
          ? JSON.parse(originalLabels)
          : originalLabels || {};

      const updateLabels: Record<string, string> = { ...newLabels };

      // empty string values indicate label deletion
      Object.keys(originalLabelsObj).forEach((originalKey) => {
        if (!(originalKey in newLabels)) {
          updateLabels[originalKey] = "";
        }
      });

      const bucket = await props.client.getBucket(bucketName);
      await bucket.update(entryName, timestamp, updateLabels);

      const displayLabels = Object.fromEntries(
        Object.entries(newLabels).filter(([, value]) => value.trim() !== ""),
      );

      setRecords((prevRecords) =>
        prevRecords.map((record) => {
          if (record.time === timestamp) {
            (record.labels as any) = displayLabels;
          }
          return record;
        }),
      );
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
      // Validate ISO date format more strictly
      // Reject simple numbers like "2025" and require proper date format
      const isSimpleNumber = /^\d{1,4}$/.test(value.trim());
      const d = dayjs(value);

      if (d.isValid() && !isSimpleNumber) {
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

  // abort ongoing fetch on unmount
  useEffect(() => {
    return () => {
      if (fetchCtrlRef.current) {
        fetchCtrlRef.current.abort();
      }
    };
  }, []);

  const renderLabels = (text: string) => {
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

    const pairs = entries.map(([key, value]) => `${key}: ${String(value)}`);
    let result = "";
    let truncated = false;

    for (const pair of pairs) {
      const tentative = result ? `${result}, ${pair}` : pair;
      if (tentative.length > 50) {
        truncated = true;
        if (!result) {
          result = pair.slice(0, 47) + "...";
        }
        break;
      }
      result = tentative;
    }

    if (truncated && !result.endsWith("...")) {
      result += "...";
    }

    return (
      <div style={{ maxWidth: 400, wordBreak: "break-word" }}>{result}</div>
    );
  };

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
      render: (text: string) => renderLabels(text),
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
    record: record,
  }));

  const hasWritePermission = checkWritePermission(permissions, bucketName);

  const showResetButton =
    timeRange.start !== defaultRange.start ||
    timeRange.end !== defaultRange.end;

  const handleResetZoom = () => {
    setTimeRange(defaultRange.start, defaultRange.end);
    getRecords(defaultRange.start, defaultRange.end);
  };

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
        onCancel={() => setIsDeleteModalVisible(false)}
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
                setTimeRange(start, end);
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
            }}
            onBeforeChange={(editor: any, data: any, value: string) => {
              setWhenCondition(value);
              if (whenError) {
                setWhenError("");
              }
            }}
            onBlur={(editor: any) => {
              const value = editor.getValue() || "";
              const formatted = formatJSON(value);
              if (formatted !== value) {
                setWhenCondition(formatted);
              }
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
            <strong>Macros:</strong> Use <code>$__interval</code> to
            automatically use the chart's time interval. Example:{" "}
            <code>{'{"$each_t": "$__interval"}'}</code>.
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
          <Button
            onClick={() => getRecords(timeRange.start, timeRange.end)}
            type={isLoading ? "default" : "primary"}
            danger={isLoading}
            style={{
              // fixed width to prevent ResizeObserver errors
              width: 120,
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {isLoading ? "Cancel" : "Fetch Records"}
          </Button>
          {showResetButton && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetZoom}
              title="Reset to default range"
              type="default"
              style={{ marginLeft: 8 }}
            />
          )}
        </div>
      </div>
      <DataVolumeChart
        records={records}
        setTimeRange={(start, end) => {
          setTimeRange(start, end);
          getRecords(start, end);
        }}
        isLoading={isLoading}
        showUnix={showUnix}
        interval={timeRange.interval}
      />
      <ScrollableTable
        scroll={{ x: "max-content" }}
        columns={columns as any[]}
        dataSource={data}
        expandable={{
          expandedRowRender: (record: any) => (
            <div key={`expanded-row-${record.key}`}>
              {bucket && (
                <RecordPreview
                  contentType={record.record.contentType || ""}
                  size={Number(record.record.size)}
                  fileName={generateFileName(
                    record.key,
                    record.record.contentType,
                  )}
                  entryName={entryName}
                  timestamp={BigInt(record.key)}
                  bucket={bucket}
                />
              )}
              <EditRecordLabels
                key={`edit-labels-${record.key}`}
                record={record}
                onLabelsUpdated={handleLabelsUpdated}
                editable={hasWritePermission}
              />
            </div>
          ),
        }}
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
