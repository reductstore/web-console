import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Client } from "reduct-js";
import { Table, Typography } from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { DownloadOutlined } from "@ant-design/icons";

// @ts-ignore
import prettierBytes from "prettier-bytes";

interface Props {
  client: Client;
}

export default function EntryDetail(props: Readonly<Props>) {
  const { bucketName, entryName } = useParams() as {
    bucketName: string;
    entryName: string;
  };
  const [records, setRecords] = useState<ReadableRecord[]>([]);

  const getRecords = async () => {
    try {
      const bucket = await props.client.getBucket(bucketName);
      for await (const record of bucket.query(entryName, undefined, undefined, {
        limit: 3,
      })) {
        setRecords((records) => [...records, record]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getRecords();
  }, [bucketName, entryName]);

  const handleDownload = async (record: any) => {
    console.log(record);
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
    labels: JSON.stringify(record.labels),
  }));

  return (
    <div style={{ margin: "1.4em" }}>
      <Typography.Title level={3}>Records for {entryName}</Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={records.length === 0}
      />
    </div>
  );
}
