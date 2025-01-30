import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Client } from "reduct-js";
import {
  Table,
  Typography,
  DatePicker,
  Button,
  InputNumber,
  Checkbox,
} from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

// @ts-ignore
import prettierBytes from "prettier-bytes";

interface Props {
  client: Client;
}

type LabelMap = Record<string, string | number | boolean | bigint>;

const formatLabels = (labels: LabelMap): string => {
  return Object.entries(labels)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
};

export default function EntryDetail(props: Readonly<Props>) {
  const { bucketName, entryName } = useParams() as {
    bucketName: string;
    entryName: string;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<ReadableRecord[]>([]);
  const [start, setStart] = useState<bigint | undefined>(undefined);
  const [end, setEnd] = useState<bigint | undefined>(undefined);
  const [minTime, setMinTime] = useState<bigint | undefined>(undefined);
  const [maxTime, setMaxTime] = useState<bigint | undefined>(undefined);
  const [limit, setLimit] = useState<number | undefined>(2);
  const [showUnix, setShowUnix] = useState(false);

  const getRecords = async (start?: bigint, end?: bigint, limit?: number) => {
    setIsLoading(true);
    try {
      const bucket = await props.client.getBucket(bucketName);

      const lastRecordTime =
        records.length > 0 ? records[records.length - 1].time + 1n : start;

      const adjustedStart =
        start !== undefined &&
        lastRecordTime !== undefined &&
        lastRecordTime < start
          ? start
          : lastRecordTime;

      const adjustedEnd =
        end !== undefined && adjustedStart !== undefined && end < adjustedStart
          ? adjustedStart
          : end;

      for await (const record of bucket.query(
        entryName,
        adjustedStart,
        adjustedEnd,
        {
          limit: limit,
        },
      )) {
        setRecords((records) => [...records, record]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchRecords = () => {
    if (!isLoading) {
      getRecords(start, end, limit);
    }
  };

  useEffect(() => {
    const getOldestAndLatestTimestamps = async () => {
      try {
        const bucket = await props.client.getBucket(bucketName);
        const entries = await bucket.getEntryList();
        const entry = entries.find((entry) => entry.name === entryName);
        if (!entry) {
          return;
        }
        setMinTime(entry.oldestRecord);
        setMaxTime(entry.latestRecord);
      } catch (err) {
        console.error(err);
      }
    };

    getOldestAndLatestTimestamps();
    handleFetchRecords();
  }, [bucketName, entryName]);

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
    // todo: check how to convert dates to bigint correctly
    console.log(dates);
    if (dates) {
      setStart(BigInt(dates[0].valueOf()) * 1000n);
      setEnd(BigInt(dates[1].valueOf()) * 1000n);
    } else {
      setStart(undefined);
      setEnd(undefined);
    }
  };

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
    labels: formatLabels(record.labels as LabelMap),
  }));

  return (
    <div style={{ margin: "1.4em" }}>
      <Typography.Title level={3}>Records for {entryName}</Typography.Title>
      <div style={{ marginBottom: "1em" }}>
        <Checkbox
          onChange={(e) => setShowUnix(e.target.checked)}
          style={{ marginBottom: "1em" }}
        >
          Show Unix Timestamps
        </Checkbox>
        <div style={{ marginBottom: "1em" }}>
          {showUnix ? (
            <>
              <InputNumber
                placeholder="Start time (Unix)"
                onChange={(value) =>
                  setStart(value ? BigInt(value) : undefined)
                }
                style={{ marginRight: "1em", width: 180 }}
                min={minTime ? Number(minTime) : undefined}
                max={
                  maxTime && end
                    ? Number(Math.min(Number(maxTime), Number(end)))
                    : undefined
                }
              />
              <InputNumber
                placeholder="End time (Unix)"
                onChange={(value) => setEnd(value ? BigInt(value) : undefined)}
                style={{ marginRight: "1em", width: 180 }}
                min={
                  start && minTime
                    ? Number(Math.max(Number(start), Number(minTime)))
                    : undefined
                }
                max={maxTime ? Number(maxTime) : undefined}
              />
            </>
          ) : (
            <DatePicker.RangePicker
              showTime
              onChange={handleDateChange}
              style={{ marginRight: "1em" }}
              minDate={minTime ? dayjs(Number(minTime / 1000n)) : undefined}
              maxDate={maxTime ? dayjs(Number(maxTime / 1000n)) : undefined}
            />
          )}
          <InputNumber
            min={1}
            addonBefore="Limit"
            onChange={(value) => setLimit(value ? Number(value) : undefined)}
            style={{ width: 150 }}
            defaultValue={limit}
          />
        </div>
        <Button onClick={handleFetchRecords} type="primary">
          Fetch Records
        </Button>
      </div>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
