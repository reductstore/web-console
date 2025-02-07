import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Client, EntryInfo, TokenPermissions } from "reduct-js";
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
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";

// @ts-ignore
import prettierBytes from "prettier-bytes";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
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
  const [limit, setLimit] = useState<number | undefined>(10);
  const [showUnix, setShowUnix] = useState(false);
  const [entryInfo, setEntryInfo] = useState<EntryInfo>();

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

  useEffect(() => {
    getEntryInfo();
    handleFetchRecords();
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
    labels: formatLabels(record.labels as LabelMap),
  }));

  return (
    <div className="entryDetail">
      {entryInfo && (
        <EntryCard
          entryInfo={entryInfo}
          bucketName={bucketName}
          permissions={props.permissions}
          showUnix={showUnix}
          onDelete={() => {
            /* implement delete handling */
          }}
        />
      )}
      <Typography.Title level={3}>Records</Typography.Title>
      <Checkbox onChange={(e) => setShowUnix(e.target.checked)}>
        Unix Timestamp
      </Checkbox>
      <div className="detailControls">
        {showUnix ? (
          <div className="timeInputs">
            <InputNumber
              placeholder="Start Time (Unix)"
              onChange={(value) => setStart(value ? BigInt(value) : undefined)}
              className="timeInput"
              max={Number(end)}
            />
            <InputNumber
              placeholder="End Time (Unix)"
              onChange={(value) => setEnd(value ? BigInt(value) : undefined)}
              className="timeInput"
              min={Number(start)}
            />
          </div>
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
        <Button onClick={handleFetchRecords} type="primary">
          Fetch Records
        </Button>
      </div>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
