import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Client } from "reduct-js";
import { Table, Typography, DatePicker, Button, InputNumber } from "antd";
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
  const [records, setRecords] = useState<ReadableRecord[]>([]);
  const [start, setStart] = useState<bigint | undefined>(undefined);
  const [end, setEnd] = useState<bigint | undefined>(undefined);
  const [limit, setLimit] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchOldestAndLatestRecords = async () => {
      try {
        const bucket = await props.client.getBucket(bucketName);
        const entries = await bucket.getEntryList();
        const entry = entries.find((entry) => entry.name === entryName);
        if (!entry) {
          return;
        }
        setStart(entry.oldestRecord);
        setEnd(entry.latestRecord);
      } catch (err) {
        console.error(err);
      }
    };

    fetchOldestAndLatestRecords();
  }, [bucketName, entryName]);

  const getRecords = async (start?: bigint, end?: bigint, limit?: number) => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      for await (const record of bucket.query(entryName, start, end, {
        limit: limit,
      })) {
        setRecords((records) => [...records, record]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (record: any) => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      const data = await (await bucket.beginRead(entryName, record.key)).read();
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
    if (dates) {
      setStart(BigInt(dates[0].valueOf() * 1000));
      setEnd(BigInt(dates[1].valueOf() * 1000));
    } else {
      setStart(undefined);
      setEnd(undefined);
    }
  };

  const handleFetchRecords = () => {
    setRecords([]);
    getRecords(start, end, limit);
  };

  const columns = [
    { title: "Timestamp", dataIndex: "timestamp", key: "timestamp" },
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
    timestamp: new Date(Number(record.time / 1000n)).toISOString(),
    size: prettierBytes(Number(record.size)),
    contentType: record.contentType,
    labels: formatLabels(record.labels as LabelMap),
  }));

  return (
    <div style={{ margin: "1.4em" }}>
      <Typography.Title level={3}>Records for {entryName}</Typography.Title>
      <DatePicker.RangePicker
        showTime
        onChange={handleDateChange}
        style={{ marginBottom: "1em" }}
        minDate={start ? dayjs(Number(start / 1000n)) : undefined}
        maxDate={end ? dayjs(Number(end / 1000n)) : undefined}
      />
      <InputNumber
        min={1}
        placeholder="Limit"
        onChange={(value) => setLimit(value ? Number(value) : undefined)}
        style={{ marginLeft: "1em" }}
      />
      <Button
        onClick={handleFetchRecords}
        type="primary"
        style={{ marginLeft: "1em" }}
      >
        Fetch Records
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        loading={records.length === 0}
      />
    </div>
  );
}
