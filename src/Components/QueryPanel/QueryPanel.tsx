import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  APIError,
  Bucket,
  Client,
  EntryInfo,
  QueryOptions,
  TokenPermissions,
} from "reduct-js";
import { Typography, Button, Input, Select, Modal, Space, message } from "antd";
import type { ColumnType } from "antd/es/table";
import {
  DeleteOutlined,
  DownloadOutlined,
  LoadingOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { JsonQueryEditor } from "../JsonEditor";
import { getExtensionFromContentType } from "../../Helpers/contentType";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import TimeRangeDropdown from "../Entry/TimeRangeDropdown";
import ScrollableTable from "../ScrollableTable";
import ShareLinkModal from "../ShareLinkModal";
import DataVolumeChart from "../Entry/DataVolumeChart";
import dayjs from "../../Helpers/dayjsConfig";
import {
  DEFAULT_RANGE_KEY,
  detectRangeKey,
  getDefaultTimeRange,
  getTimeRangeFromKey,
} from "../../Helpers/timeRangeUtils";
import { formatValue } from "../../Helpers/timeFormatUtils";
import { pickEachTInterval } from "../../Helpers/chartUtils";
import {
  checkReadPermission,
  checkWritePermission,
} from "../../Helpers/permissionUtils";
import {
  extractIntervalFromCondition,
  formatAsStrictJSON,
  processWhenCondition,
} from "../../Helpers/json5Utils";
import EditRecordLabels from "../EditRecordLabels";
import RecordPreview from "../RecordPreview";
import SaveQueryModal from "../SavedQueries/SaveQueryModal";
import QuerySelector from "../SavedQueries/QuerySelector";
import { SavedQuery, useQueryStore } from "../../stores/queryStore";
import UploadFileForm from "../Entry/UploadFileForm";
import "../../Views/BucketPanel/EntryDetail.css";

interface RecordQueryContext {
  bucketName: string;
  entries: string[];
  start?: bigint;
  end?: bigint;
  options?: QueryOptions;
}

interface IndexedReadableRecord {
  record: ReadableRecord;
  tableIndex: number;
}

interface RecordTableRow {
  key: string;
  entryName: string;
  timestamp: bigint;
  tableIndex: number;
  size: number;
  prettySize: string;
  contentType: string | undefined;
  labels: string;
  record: ReadableRecord;
}

interface QueryPanelProps {
  client: Client;
  apiUrl: string;
  permissions?: TokenPermissions;
  initialBucketName?: string;
  initialEntries?: string[];
  showSelectionControls?: boolean;
  allowUpload?: boolean;
  uploadTriggerRef?: React.MutableRefObject<(() => void) | null>;
  autoFetchOnSelectionChange?: boolean;
  title?: React.ReactNode;
  warning?: React.ReactNode;
}

const EMPTY_ENTRIES: string[] = [];

const normalizeEntrySelection = (entries: string[]): string[] =>
  Array.from(
    new Set(entries.map((entry) => entry.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

const entrySelectionToQueryArg = (
  entries: string[],
): string | string[] | undefined => {
  if (entries.length === 0) {
    return undefined;
  }

  return entries.length === 1 ? entries[0] : entries;
};

const defaultQuery = formatAsStrictJSON({ $each_t: "$__interval" });

export default function QueryPanel({
  client,
  apiUrl,
  permissions,
  initialBucketName = "",
  initialEntries = EMPTY_ENTRIES,
  showSelectionControls = false,
  allowUpload = false,
  uploadTriggerRef,
  autoFetchOnSelectionChange = false,
  title = "Records",
  warning,
}: Readonly<QueryPanelProps>) {
  const normalizedInitialEntries = useMemo(
    () => normalizeEntrySelection(initialEntries),
    [initialEntries],
  );
  const [bucketName, setBucketName] = useState(initialBucketName);
  const [selectedEntries, setSelectedEntries] = useState(
    normalizedInitialEntries,
  );
  const [visibleBuckets, setVisibleBuckets] = useState<string[]>([]);
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);
  const [bucketEntryInfo, setBucketEntryInfo] = useState<EntryInfo[]>([]);
  const [records, setRecords] = useState<IndexedReadableRecord[]>([]);
  const [queryContext, setQueryContext] = useState<RecordQueryContext | null>(
    null,
  );
  const [startError, setStartError] = useState(false);
  const [stopError, setStopError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBucketLoading, setIsBucketLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const cancelDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [whenCondition, setWhenCondition] = useState<string>(defaultQuery);
  const [fetchError, setFetchError] = useState<string>("");
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RecordTableRow | null>(
    null,
  );
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [recordToShare, setRecordToShare] = useState<RecordTableRow | null>(
    null,
  );
  const [isSaveQueryModalVisible, setIsSaveQueryModalVisible] = useState(false);
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [showUnix, setShowUnix] = useState(false);
  const fetchCtrlRef = useRef<AbortController | null>(null);

  const defaultRange = useMemo(() => getDefaultTimeRange(), []);
  const [timeRange, setTimeRangeState] = useState(() => ({
    start: defaultRange.start as bigint | undefined,
    end: defaultRange.end as bigint | undefined,
    startText: formatValue(defaultRange.start, false),
    stopText: formatValue(defaultRange.end, false),
    interval: null as string | null,
  }));

  const { getLoadedQueryName, getQueries } = useQueryStore();

  useEffect(() => {
    setBucketName(initialBucketName);
    setSelectedEntries(normalizedInitialEntries);
  }, [initialBucketName, normalizedInitialEntries]);

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
      return;
    }

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
  };

  const processConditionWithMacros = (
    conditionString: string,
    intervalValue: string,
  ): {
    success: boolean;
    processedCondition?: Record<string, unknown>;
    error?: string;
  } => {
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

  const buildLinkQueryOptions = (
    source?: QueryOptions,
  ): QueryOptions | undefined => {
    if (!source) return undefined;
    const linkOptions = new QueryOptions();
    Object.assign(linkOptions, source);
    linkOptions.head = false;
    return linkOptions;
  };

  const loadVisibleBuckets = useCallback(async () => {
    if (!showSelectionControls) {
      return;
    }

    setIsBucketLoading(true);
    try {
      const bucketList = await client.getBucketList();
      const names = bucketList
        .map((bucketInfo) => bucketInfo.name)
        .filter((name) => {
          if (!permissions || permissions.fullAccess) return true;
          if (!permissions.read || permissions.read.length === 0) return true;
          return checkReadPermission(permissions, name);
        })
        .sort((a, b) => a.localeCompare(b));
      setVisibleBuckets(names);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBucketLoading(false);
    }
  }, [client, permissions, showSelectionControls]);

  useEffect(() => {
    loadVisibleBuckets().then();
  }, [loadVisibleBuckets]);

  const loadBucketEntries = useCallback(async () => {
    if (!bucketName) {
      setAvailableEntries([]);
      setBucketEntryInfo([]);
      return;
    }

    try {
      const bucketInstance = await client.getBucket(bucketName);
      const entries = await bucketInstance.getEntryList();
      const names = entries
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
      setAvailableEntries(names);
      setBucketEntryInfo(entries);
    } catch (err) {
      console.error(err);
      setAvailableEntries([]);
      setBucketEntryInfo([]);
    }
  }, [bucketName, client]);

  useEffect(() => {
    loadBucketEntries().then();
  }, [loadBucketEntries]);

  const selectedEntryQuery = useMemo(
    () => entrySelectionToQueryArg(selectedEntries),
    [selectedEntries],
  );
  const entryOptions = useMemo(() => {
    const allEntryNames = normalizeEntrySelection([
      ...availableEntries,
      ...selectedEntries,
    ]);
    const childCount = new Map<string, number>();
    const nonLeafSet = new Set<string>();
    for (const entry of allEntryNames) {
      const slashIdx = entry.lastIndexOf("/");
      if (slashIdx !== -1) {
        // Mark all ancestor segments as non-leaf
        let path = entry.substring(0, slashIdx);
        while (path) {
          nonLeafSet.add(path);
          const idx = path.lastIndexOf("/");
          path = idx !== -1 ? path.substring(0, idx) : "";
        }
        // Count direct children
        const parent = entry.substring(0, slashIdx);
        childCount.set(parent, (childCount.get(parent) ?? 0) + 1);
      }
    }
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const entry of allEntryNames) {
      if (nonLeafSet.has(entry) && (childCount.get(entry) ?? 0) > 1) {
        // Non-leaf with multiple children: show wildcard option instead
        const wildcard = `${entry}/*`;
        if (!seen.has(wildcard)) {
          seen.add(wildcard);
          options.push({ label: wildcard, value: wildcard });
        }
      } else if (!nonLeafSet.has(entry)) {
        // Leaf: show as-is
        if (!seen.has(entry)) {
          seen.add(entry);
          options.push({ label: entry, value: entry });
        }
      }
      // Non-leaf with 1 child: skip (child is already listed)
    }
    return options;
  }, [availableEntries, selectedEntries]);
  const getRecordEntryName = useCallback(
    (record: ReadableRecord) => record.entry || selectedEntries[0] || "",
    [selectedEntries],
  );

  const hasWritePermission = bucketName
    ? checkWritePermission(permissions, bucketName)
    : false;
  const canUploadToSelection =
    allowUpload && hasWritePermission && selectedEntries.length === 1;

  useEffect(() => {
    if (uploadTriggerRef) {
      uploadTriggerRef.current = canUploadToSelection
        ? () => setIsUploadModalVisible(true)
        : null;
    }
  }, [canUploadToSelection, uploadTriggerRef]);

  const hasValidSelection =
    bucketName.trim().length > 0 && !!selectedEntryQuery;

  const getSelectionRangeFallback = (): {
    start?: bigint;
    end?: bigint;
  } => {
    const selectedInfo =
      selectedEntries.length === 1
        ? bucketEntryInfo.find((entry) => entry.name === selectedEntries[0])
        : undefined;

    return {
      start: timeRange.start ?? selectedInfo?.oldestRecord,
      end: timeRange.end ?? selectedInfo?.latestRecord,
    };
  };

  const getRecords = useCallback(
    async (start?: bigint, end?: bigint) => {
      if (!bucketName || !selectedEntryQuery) {
        setFetchError("Select a bucket and at least one entry.");
        return;
      }

      if (fetchCtrlRef.current) {
        fetchCtrlRef.current.abort();
      }

      fetchCtrlRef.current = new AbortController();
      const abortSignal = fetchCtrlRef.current.signal;

      setIsLoading(true);
      setShowCancel(false);
      if (cancelDelayRef.current) clearTimeout(cancelDelayRef.current);
      cancelDelayRef.current = setTimeout(() => setShowCancel(true), 500);
      setFetchError("");
      setRecords([]);

      try {
        const bucketInstance = await client.getBucket(bucketName);
        setBucket(bucketInstance);

        const options = new QueryOptions();
        options.head = true;
        options.strict = true;

        if (whenCondition.trim()) {
          const fallback = getSelectionRangeFallback();
          const macroValue = pickEachTInterval(
            start ?? fallback.start,
            end ?? fallback.end,
          );
          const conditionResult = processConditionWithMacros(
            whenCondition,
            macroValue,
          );

          if (!conditionResult.success) {
            setFetchError(conditionResult.error || "Invalid condition");
            setIsLoading(false);
            return;
          }

          const each_t = extractIntervalFromCondition(
            conditionResult.processedCondition,
          );
          setTimeRangeState((prev) => ({ ...prev, interval: each_t }));
          options.when = conditionResult.processedCondition;
        }

        setQueryContext({
          bucketName,
          entries: [...selectedEntries],
          start,
          end,
          options,
        });

        let batch: IndexedReadableRecord[] = [];
        let count = 0;
        for await (const record of bucketInstance.query(
          selectedEntryQuery,
          start,
          end,
          options,
        )) {
          if (abortSignal.aborted) return;
          batch.push({
            record,
            tableIndex: count,
          });
          count++;

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

        if (err instanceof APIError && err.message) {
          setFetchError(err.message);
        } else if (err instanceof SyntaxError) {
          setFetchError(err.message);
        } else {
          setFetchError("Failed to fetch records.");
        }
      } finally {
        if (cancelDelayRef.current) {
          clearTimeout(cancelDelayRef.current);
          cancelDelayRef.current = null;
        }
        setShowCancel(false);
        setIsLoading(false);
        fetchCtrlRef.current = null;
      }
    },
    [
      bucketEntryInfo,
      bucketName,
      client,
      selectedEntries,
      selectedEntryQuery,
      timeRange.end,
      timeRange.start,
      whenCondition,
    ],
  );

  useEffect(() => {
    if (!autoFetchOnSelectionChange || !hasValidSelection) {
      return;
    }

    getRecords(timeRange.start, timeRange.end).then();
  }, [
    autoFetchOnSelectionChange,
    getRecords,
    hasValidSelection,
    timeRange.end,
    timeRange.start,
  ]);

  useEffect(() => {
    return () => {
      if (fetchCtrlRef.current) {
        fetchCtrlRef.current.abort();
      }
      if (cancelDelayRef.current) {
        clearTimeout(cancelDelayRef.current);
      }
    };
  }, []);

  const generateFileName = (
    entryName: string,
    recordKey: string,
    contentType: string,
  ): string => {
    const ext = getExtensionFromContentType(contentType || "");
    return `${entryName}-${recordKey}${ext}`;
  };

  const handleDownload = async (row: RecordTableRow) => {
    if (!queryContext || downloadingKey !== null) return;
    setDownloadingKey(row.key);

    try {
      const bucketInstance = await client.getBucket(queryContext.bucketName);
      const fileName = generateFileName(
        row.entryName,
        row.key,
        row.contentType || "",
      );
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      const shareLink = await bucketInstance.createQueryLink(
        entrySelectionToQueryArg(queryContext.entries) ?? row.entryName,
        queryContext.start,
        queryContext.end,
        buildLinkQueryOptions(queryContext.options),
        row.tableIndex,
        expireAt,
        fileName,
        apiUrl,
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
      setTimeout(() => {
        setDownloadingKey(null);
      }, 2000);
    }
  };

  const handleShareClick = (row: RecordTableRow) => {
    setRecordToShare(row);
    setIsShareModalVisible(true);
  };

  const generateShareLink = async (
    expireAt: Date,
    fileName: string,
  ): Promise<string> => {
    if (!queryContext || !recordToShare) {
      throw new Error("No query context available");
    }

    const bucketInstance = await client.getBucket(queryContext.bucketName);
    return bucketInstance.createQueryLink(
      entrySelectionToQueryArg(queryContext.entries) ?? recordToShare.entryName,
      queryContext.start,
      queryContext.end,
      buildLinkQueryOptions(queryContext.options),
      recordToShare.tableIndex,
      expireAt,
      fileName,
      apiUrl,
    );
  };

  const handleDeleteClick = (row: RecordTableRow) => {
    setRecordToDelete(row);
    setIsDeleteModalVisible(true);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete || !bucketName) return;

    try {
      setIsLoading(true);
      const bucketInstance = await client.getBucket(bucketName);
      await bucketInstance.removeRecord(
        recordToDelete.entryName,
        BigInt(recordToDelete.key),
      );
      message.success("Record deleted successfully");
      setIsDeleteModalVisible(false);
      getRecords(timeRange.start, timeRange.end).then();
    } catch (err) {
      console.error(err);
      message.error("Failed to delete record");
      setIsLoading(false);
    }
  };

  const handleLabelsUpdated = async (
    entryName: string,
    newLabels: Record<string, string>,
    timestamp: bigint,
  ) => {
    try {
      const originalRecord = records.find(
        (r) =>
          r.record.time === timestamp &&
          getRecordEntryName(r.record) === entryName,
      );
      const originalLabels = originalRecord?.record.labels || {};
      const originalLabelsObj =
        typeof originalLabels === "string"
          ? JSON.parse(originalLabels)
          : originalLabels || {};

      const updateLabels: Record<string, string> = { ...newLabels };
      Object.keys(originalLabelsObj).forEach((originalKey) => {
        if (!(originalKey in newLabels)) {
          updateLabels[originalKey] = "";
        }
      });

      const bucketInstance = await client.getBucket(bucketName);
      await bucketInstance.update(entryName, timestamp, updateLabels);

      const displayLabels = Object.fromEntries(
        Object.entries(newLabels).filter(([, value]) => value.trim() !== ""),
      );

      setRecords((prevRecords) =>
        prevRecords.map((indexedRecord) => {
          if (
            indexedRecord.record.time === timestamp &&
            getRecordEntryName(indexedRecord.record) === entryName
          ) {
            (indexedRecord.record.labels as Record<string, string>) =
              displayLabels;
          }
          return indexedRecord;
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

  const renderLabels = (text: string) => {
    if (!text) return "-";

    let parsed: Record<string, unknown> | null;
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
          result = `${pair.slice(0, 47)}...`;
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

  const showEntryColumn =
    showSelectionControls ||
    selectedEntries.length !== 1 ||
    selectedEntries.some((e) => e.includes("*"));

  const columns: ColumnType<RecordTableRow>[] = [
    {
      title: "Timestamp",
      dataIndex: "timestamp",
      key: "timestamp",
      fixed: "left" as const,
      render: (_: bigint, row: RecordTableRow) =>
        showUnix
          ? row.timestamp.toString()
          : dayjs(Number(row.timestamp / 1000n)).toISOString(),
    },
    ...(showEntryColumn
      ? [
          {
            title: "Entry",
            dataIndex: "entryName",
            key: "entryName",
            render: (name: string) => name || "—",
          } satisfies ColumnType<RecordTableRow>,
        ]
      : []),
    { title: "Size", dataIndex: "prettySize", key: "size" },
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
      render: (_: unknown, row: RecordTableRow) => (
        <Space size="middle">
          {downloadingKey === row.key ? (
            <LoadingOutlined style={{ cursor: "default" }} />
          ) : (
            <DownloadOutlined
              onClick={() => handleDownload(row)}
              style={{ cursor: "pointer" }}
              title="Download record"
            />
          )}
          <ShareAltOutlined
            onClick={() => handleShareClick(row)}
            style={{ cursor: "pointer" }}
            title="Share record"
          />
          {hasWritePermission && (
            <DeleteOutlined
              onClick={() => handleDeleteClick(row)}
              style={{ cursor: "pointer", color: "#ff4d4f" }}
              title="Delete record"
            />
          )}
        </Space>
      ),
    },
  ];

  const data: RecordTableRow[] = records.map((indexedRecord) => {
    const entryName = getRecordEntryName(indexedRecord.record);
    const ts = indexedRecord.record.time.toString();
    return {
      key: showEntryColumn ? `${entryName}:${ts}` : ts,
      entryName,
      timestamp: indexedRecord.record.time,
      tableIndex: indexedRecord.tableIndex,
      size: Number(indexedRecord.record.size),
      prettySize: prettierBytes(Number(indexedRecord.record.size)),
      contentType: indexedRecord.record.contentType,
      labels: JSON.stringify(indexedRecord.record.labels, null, 2),
      record: indexedRecord.record,
    };
  });

  const handleLoadQuery = useCallback(
    (saved: SavedQuery) => {
      // Restore bucket and entries if available (query page)
      if (showSelectionControls) {
        if (saved.bucketName) {
          setBucketName(saved.bucketName);
        }
        if (saved.entries && saved.entries.length > 0) {
          setSelectedEntries(saved.entries);
        }
      }

      setWhenCondition(saved.query);
      setFetchError("");
      const useUnix = saved.timeFormat ? saved.timeFormat === "Unix" : showUnix;
      if (saved.timeFormat) {
        setShowUnix(useUnix);
      }

      let start: bigint | undefined;
      let end: bigint | undefined;
      if (saved.rangeKey && saved.rangeKey !== "custom") {
        try {
          ({ start, end } = getTimeRangeFromKey(saved.rangeKey));
        } catch {
          // ignore invalid range keys
        }
      } else if (
        saved.rangeKey === "custom" &&
        saved.rangeStart &&
        saved.rangeEnd
      ) {
        start = BigInt(saved.rangeStart);
        end = BigInt(saved.rangeEnd);
      }

      if (start !== undefined && end !== undefined) {
        setTimeRangeState((prev) => ({
          ...prev,
          start,
          end,
          startText: formatValue(start, useUnix),
          stopText: formatValue(end, useUnix),
        }));
      }
    },
    [showUnix, showSelectionControls],
  );

  const currentQuerySnapshot = (): SavedQuery => ({
    name: getLoadedQueryName(bucketName, selectedEntries) ?? "",
    query: whenCondition,
    timeFormat: showUnix ? "Unix" : "UTC",
    rangeKey: detectRangeKey(timeRange.start, timeRange.end),
    rangeStart: timeRange.start?.toString(),
    rangeEnd: timeRange.end?.toString(),
    bucketName,
    entries: [...selectedEntries],
  });

  const handleSaveQuery = () => {
    if (!hasValidSelection) {
      return;
    }

    const loadedName = getLoadedQueryName(bucketName, selectedEntries);
    if (loadedName) {
      const { saveQuery } = useQueryStore.getState();
      saveQuery(bucketName, selectedEntries, currentQuerySnapshot());
      message.success(`Query "${loadedName}" updated`);
    } else {
      setIsSaveQueryModalVisible(true);
    }
  };

  const isSaveDisabled = (() => {
    if (!hasValidSelection || !whenCondition.trim()) {
      return true;
    }
    const loadedName = getLoadedQueryName(bucketName, selectedEntries);
    if (!loadedName) return false;
    const loaded = getQueries(bucketName, selectedEntries).find(
      (query) => query.name === loadedName,
    );
    if (!loaded) return false;
    const snap = currentQuerySnapshot();
    return (
      loaded.query === snap.query &&
      loaded.timeFormat === snap.timeFormat &&
      loaded.rangeKey === snap.rangeKey &&
      (snap.rangeKey !== "custom" ||
        (loaded.rangeStart === snap.rangeStart &&
          loaded.rangeEnd === snap.rangeEnd))
    );
  })();

  const entryValidationSelection = useMemo(
    () => normalizeEntrySelection(selectedEntries),
    [selectedEntries],
  );
  const validationIntervalValue = useMemo(
    () =>
      timeRange.interval ?? pickEachTInterval(timeRange.start, timeRange.end),
    [timeRange.end, timeRange.interval, timeRange.start],
  );

  return (
    <>
      <Modal
        title="Upload File"
        open={isUploadModalVisible}
        onCancel={() => setIsUploadModalVisible(false)}
        footer={null}
        width={600}
      >
        <UploadFileForm
          client={client}
          bucketName={bucketName}
          entryName={selectedEntries[0] ?? ""}
          availableEntries={availableEntries}
          onUploadSuccess={() => {
            setIsUploadModalVisible(false);
            getRecords(timeRange.start, timeRange.end).then();
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
            <Typography.Text strong>Entry: </Typography.Text>
            <Typography.Text>{recordToDelete.entryName}</Typography.Text>
            <br />
            <Typography.Text strong>Timestamp: </Typography.Text>
            <Typography.Text>
              {showUnix
                ? recordToDelete.timestamp.toString()
                : new Date(
                    Number(recordToDelete.timestamp / 1000n),
                  ).toISOString()}
            </Typography.Text>
          </div>
        )}
      </Modal>

      {title ? <Typography.Title level={3}>{title}</Typography.Title> : null}
      {warning}
      <div className="detailControls">
        <div className="jsonFilterSection">
          <div className="jsonFilterPanel">
            <div className="jsonFilterHeader queryHeaderBar">
              {showSelectionControls && (
                <div className="querySection">
                  <Typography.Text strong className="querySectionLabel">
                    Data Source
                  </Typography.Text>
                  <div className="querySourceRow">
                    <div className="queryFieldGroup">
                      <Typography.Text
                        type="secondary"
                        className="queryFieldLabel"
                      >
                        Bucket
                      </Typography.Text>
                      <Select
                        className="queryBucketSelect"
                        showSearch
                        placeholder="Select bucket"
                        value={bucketName || undefined}
                        loading={isBucketLoading}
                        popupMatchSelectWidth={false}
                        onChange={(value) => {
                          setBucketName(value);
                          setSelectedEntries([]);
                          setRecords([]);
                          setQueryContext(null);
                          setFetchError("");
                        }}
                        data-testid="bucket-query-select"
                        style={{ width: "100%" }}
                        options={visibleBuckets.map((name) => ({
                          value: name,
                          label: name,
                        }))}
                      />
                    </div>
                    <div className="queryFieldGroup queryFieldGroupEntries">
                      <Typography.Text
                        type="secondary"
                        className="queryFieldLabel"
                      >
                        Entries
                      </Typography.Text>
                      <Select<string[]>
                        className="queryEntrySelect"
                        mode="tags"
                        placeholder="Select entries or type a pattern (e.g. sensor-*)"
                        value={selectedEntries}
                        popupMatchSelectWidth={false}
                        onChange={(values) => {
                          setSelectedEntries(normalizeEntrySelection(values));
                          setRecords([]);
                          setQueryContext(null);
                          setFetchError("");
                        }}
                        disabled={!bucketName}
                        showSearch={{ optionFilterProp: "label" }}
                        data-testid="entry-query-select"
                        style={{ width: "100%" }}
                        maxTagCount={4}
                        maxTagTextLength={30}
                        maxTagPlaceholder={(omittedValues) =>
                          `+${omittedValues.length} more`
                        }
                        options={entryOptions}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="querySection">
                <Typography.Text strong className="querySectionLabel">
                  Time Range
                </Typography.Text>
                <div className="queryTimeRow">
                  <Select
                    data-testid="format-select"
                    value={showUnix ? "Unix" : "UTC"}
                    onChange={handleFormatChange}
                    popupMatchSelectWidth={false}
                    style={{ width: 90 }}
                    options={[
                      { value: "UTC", label: "UTC" },
                      { value: "Unix", label: "Unix" },
                    ]}
                  />
                  <TimeRangeDropdown
                    onSelectRange={(start, end) => {
                      setTimeRange(start, end);
                      setStartError(false);
                      setStopError(false);
                    }}
                    initialRangeKey={DEFAULT_RANGE_KEY}
                    currentRange={{
                      start: timeRange.start,
                      end: timeRange.end,
                    }}
                  />
                  <Space.Compact style={{ width: 300, flexShrink: 0 }}>
                    <Input
                      style={{
                        width: 70,
                        flexShrink: 0,
                        pointerEvents: "none",
                        backgroundColor: "#fafafa",
                        textAlign: "center",
                      }}
                      value="Start"
                      readOnly
                      tabIndex={-1}
                    />
                    <Input
                      placeholder="Start time (optional)"
                      value={timeRange.startText}
                      onChange={(e) => {
                        updateTimeRangeText("startText", e.target.value);
                        parseInput(e.target.value, "start", setStartError);
                      }}
                      status={startError ? "error" : undefined}
                    />
                  </Space.Compact>
                  <Space.Compact style={{ width: 300, flexShrink: 0 }}>
                    <Input
                      style={{
                        width: 70,
                        flexShrink: 0,
                        pointerEvents: "none",
                        backgroundColor: "#fafafa",
                        textAlign: "center",
                      }}
                      value="Stop"
                      readOnly
                      tabIndex={-1}
                    />
                    <Input
                      placeholder="Stop time (optional)"
                      value={timeRange.stopText}
                      onChange={(e) => {
                        updateTimeRangeText("stopText", e.target.value);
                        parseInput(e.target.value, "end", setStopError);
                      }}
                      status={stopError ? "error" : undefined}
                    />
                  </Space.Compact>
                </div>
              </div>

              <div className="querySection">
                <Typography.Text strong className="querySectionLabel">
                  Conditional Query
                </Typography.Text>
                <div className="queryConditionalContent">
                  <JsonQueryEditor
                    value={whenCondition}
                    onChange={(value: string) => {
                      setWhenCondition(value);
                      if (fetchError) {
                        setFetchError("");
                      }
                    }}
                    height={Math.min(
                      400,
                      Math.max(
                        100,
                        (whenCondition + "\n").split("\n").length * 18 + 45,
                      ),
                    )}
                    error={fetchError}
                    readOnly={false}
                    validationContext={{
                      client,
                      bucket: bucketName,
                      entry: entryValidationSelection[0],
                      entries: entryValidationSelection,
                      requireEntrySelection: showSelectionControls,
                      start: timeRange.start,
                      end: timeRange.end,
                      intervalValue: validationIntervalValue,
                    }}
                    onSave={handleSaveQuery}
                    saveDisabled={isSaveDisabled}
                    toolbarExtra={
                      <QuerySelector
                        bucketName={bucketName}
                        entryName={selectedEntries}
                        onLoadQuery={handleLoadQuery}
                        editable={hasWritePermission}
                        showAllQueries={showSelectionControls}
                      />
                    }
                  />
                </div>
                <Typography.Text type="secondary" className="jsonExample">
                  Example: <code>{'{"&anomaly": { "$eq": 1 }}'}</code>
                  Use <code>&label</code> for standard labels and{" "}
                  <code>@label</code> for computed labels. Combine with
                  operators like <code>$eq</code>, <code>$gt</code>,{" "}
                  <code>$lt</code>, <code>$and</code>, etc. You can also use
                  aggregation operators:
                  <code>$each_n</code> (every N-th record) and{" "}
                  <code>$each_t</code> (every N seconds) to control replication
                  frequency.
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
                  onClick={() => {
                    if (showCancel && fetchCtrlRef.current) {
                      fetchCtrlRef.current.abort();
                    } else {
                      getRecords(timeRange.start, timeRange.end).then();
                    }
                  }}
                  type="primary"
                  danger={showCancel}
                  disabled={!hasValidSelection}
                  style={{
                    width: 130,
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {showCancel ? "Cancel" : "Fetch Records"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {records.length > 0 && (
          <div className="chartContainer">
            <DataVolumeChart
              records={records.map((r) => r.record)}
              setTimeRange={(start, end) => {
                setTimeRange(start, end);
                getRecords(start, end).then();
              }}
              isLoading={isLoading}
              showUnix={showUnix}
              interval={timeRange.interval}
            />
          </div>
        )}
      </div>

      <ScrollableTable
        scroll={{ x: "max-content" }}
        size="small"
        columns={columns}
        dataSource={data}
        expandable={{
          expandedRowRender: (row: RecordTableRow) => (
            <div key={`expanded-row-${row.entryName}-${row.key}`}>
              {bucket && queryContext && (
                <RecordPreview
                  contentType={row.contentType || ""}
                  size={row.size}
                  fileName={generateFileName(
                    row.entryName,
                    row.key,
                    row.contentType || "",
                  )}
                  entryName={
                    entrySelectionToQueryArg(queryContext.entries) ??
                    row.entryName
                  }
                  timestamp={row.timestamp}
                  bucket={bucket}
                  apiUrl={apiUrl}
                  queryStart={queryContext.start}
                  queryEnd={queryContext.end}
                  queryOptions={buildLinkQueryOptions(queryContext.options)}
                  recordIndex={row.tableIndex}
                />
              )}
              <EditRecordLabels
                key={`edit-labels-${row.entryName}-${row.key}`}
                record={row}
                onLabelsUpdated={(newLabels, timestamp) =>
                  handleLabelsUpdated(row.entryName, newLabels, timestamp)
                }
                editable={hasWritePermission}
              />
            </div>
          ),
        }}
      />

      <SaveQueryModal
        open={isSaveQueryModalVisible}
        onClose={() => setIsSaveQueryModalVisible(false)}
        bucketName={bucketName}
        entryName={selectedEntries}
        queryText={whenCondition}
        timeFormat={showUnix ? "Unix" : "UTC"}
        rangeKey={detectRangeKey(timeRange.start, timeRange.end)}
        rangeStart={timeRange.start?.toString()}
        rangeEnd={timeRange.end?.toString()}
      />

      <ShareLinkModal
        open={isShareModalVisible}
        entryName={recordToShare?.entryName ?? ""}
        record={recordToShare}
        onGenerate={generateShareLink}
        onCancel={() => setIsShareModalVisible(false)}
      />
    </>
  );
}
