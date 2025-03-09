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
  DatePicker,
  Button,
  InputNumber,
  Checkbox,
  Alert,
  Modal,
  Form,
  Tooltip,
} from "antd";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Controlled as CodeMirror } from "react-codemirror2";
import EntryCard from "../../Components/Entry/EntryCard";
import "./EntryDetail.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import { Buffer } from "buffer";
import UploadFileForm from "../../Components/Entry/UploadFileForm";

// @ts-ignore
import prettierBytes from "prettier-bytes";
interface Props {
  client: Client;
  permissions?: TokenPermissions;
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
  const [uploadForm] = Form.useForm();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [labels, setLabels] = useState<{ key: string; value: string }[]>([]);
  const [isUploadLoading, setIsUploadLoading] = useState(false);
  const [availableEntries, setAvailableEntries] = useState<string[]>([]);

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

  const handleUpload = async (values: any) => {
    setIsUploadLoading(true);
    try {
      if (!uploadFile) {
        throw new Error("Please select a file to upload");
      }

      if (!props.permissions?.write) {
        throw new Error("You don't have permission to write to this bucket.");
      }

      const bucket = await props.client.getBucket(bucketName);
      await bucket.getInfo();

      const arrayBuffer = await uploadFile.arrayBuffer();
      const writer = await bucket.beginWrite(values.entryName, {
        contentType:
          values.contentType || uploadFile.type || "application/octet-stream",
        labels: labels.reduce(
          (acc, label) => ({ ...acc, [label.key.trim()]: label.value }),
          {},
        ),
      });

      const buffer = Buffer.from(arrayBuffer);
      await writer.write(buffer);

      setIsUploadModalVisible(false);
      uploadForm.resetFields();
      setUploadFile(null);
      setLabels([]);
      setTimeout(() => getRecords(start, end, limit), 1000);
    } catch (error) {
      if (error instanceof APIError) {
        setUploadError(error.message || "An unknown error occurred.");
      } else {
        setUploadError(
          "Failed to upload file. Please check your connection and try again.",
        );
      }
    } finally {
      setIsUploadLoading(false);
    }
  };

  useEffect(() => {
    getEntryInfo();
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
    labels: JSON.stringify(record.labels, null, 2),
  }));

  const formatJSON = (jsonString: string): string => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  // Check if the bucketName is in the write permissions list
  const hasWritePermission = props.permissions?.write?.includes(bucketName);

  return (
    <div className="entryDetail">
      {entryInfo && (
        <EntryCard
          entryInfo={entryInfo}
          bucketName={bucketName}
          permissions={props.permissions}
          showUnix={showUnix}
          client={props.client}
          onRemoved={() => history.push(`/buckets/${bucketName}`)}
        />
      )}

      <Modal
        title="Upload File"
        open={isUploadModalVisible}
        onCancel={() => {
          setIsUploadModalVisible(false);
          setUploadError("");
          uploadForm.resetFields();
          setUploadFile(null);
          setLabels([]);
        }}
        footer={null}
        width={600}
      >
        <UploadFileForm
          onUpload={handleUpload}
          isUploadLoading={isUploadLoading}
          uploadError={uploadError}
          setUploadError={setUploadError}
          setUploadFile={setUploadFile}
          uploadForm={uploadForm}
          labels={labels}
          setLabels={setLabels}
          entryName={entryName}
          isItemView={true}
          availableEntries={availableEntries}
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
            onBeforeChange={(editor, data, value) => {
              setWhenCondition(value);
            }}
            onBlur={(editor) => {
              setWhenCondition(formatJSON(editor.getValue()));
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
          {hasWritePermission ? (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setIsUploadModalVisible(true)}
              style={{ marginLeft: "8px" }}
              title="Upload File"
            >
              Upload File
            </Button>
          ) : (
            <Tooltip
              title="You don't have permission to upload files"
              overlayClassName="custom-tooltip"
            >
              <Button
                type="default"
                icon={<UploadOutlined />}
                onClick={() => console.log("User has no permission")}
                style={{ marginLeft: "8px" }}
                disabled
                title="Upload File"
              >
                Upload File
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
      <Table columns={columns} dataSource={data} />
    </div>
  );
}
