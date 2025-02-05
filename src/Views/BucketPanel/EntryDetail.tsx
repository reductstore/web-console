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
  const [limit, setLimit] = useState<number | undefined>(10);
  const [showUnix, setShowUnix] = useState(false);

  const getRecords = async (start?: bigint, end?: bigint, limit?: number) => {
    setIsLoading(true);
    setRecords([]);
    try {
      const bucket = await props.client.getBucket(bucketName);
      for await (const record of bucket.query(entryName, start, end, {
        limit: limit,
      })) {
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

      <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
        <Checkbox onChange={(e) => setShowUnix(e.target.checked)}>
          Show Unix Timestamps
        </Checkbox>
        {showUnix ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <InputNumber
              placeholder="Start Time (Unix)"
              onChange={(value) => setStart(value ? BigInt(value) : undefined)}
              style={{ width: 200 }}
              min={minTime ? Number(minTime) : undefined}
              max={
                maxTime && end
                  ? Number(Math.min(Number(maxTime), Number(end)))
                  : undefined
              }
            />
            <InputNumber
              placeholder="End Time (Unix)"
              onChange={(value) => setEnd(value ? BigInt(value) : undefined)}
              style={{ width: 200 }}
              min={
                start && minTime
                  ? Number(Math.max(Number(start), Number(minTime)))
                  : undefined
              }
              max={maxTime ? Number(maxTime) : undefined}
            />
          </div>
        ) : (
          <DatePicker.RangePicker
            showTime
            placeholder={["Start Time (UTC)", "End Time (UTC)"]}
            onChange={handleDateChange}
            style={{ maxWidth: 410 }}
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
      <Button
        onClick={handleFetchRecords}
        type="primary"
        style={{ marginBottom: "1em", marginTop: "1em" }}
      >
        Fetch Records
      </Button>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
