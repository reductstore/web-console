import React, { useState } from "react";
import {
  Modal,
  Button,
  Input,
  Alert,
  DatePicker,
  Form,
  Flex,
  Typography,
  Space,
  message,
} from "antd";
import dayjs, { Dayjs } from "dayjs";
import { CopyOutlined, LinkOutlined } from "@ant-design/icons";
import { getExtensionFromContentType } from "../Helpers/contentType";

interface ShareLinkModalProps {
  open: boolean;
  entryName: string;
  record: any;
  onGenerate: (expireAt: Date, fileName: string) => Promise<string>;
  onCancel: () => void;
  errorMessage?: string | null;
}

const PRESETS: {
  key: string;
  label: string;
  add: dayjs.ManipulateType;
  amount: number;
}[] = [
  { key: "1h", label: "1 Hour", add: "hour", amount: 1 },
  { key: "6h", label: "6 Hours", add: "hour", amount: 6 },
  { key: "24h", label: "24 Hours", add: "hour", amount: 24 },
  { key: "7d", label: "7 Days", add: "day", amount: 7 },
  { key: "30d", label: "30 Days", add: "day", amount: 30 },
];

export default function ShareLinkModal({
  open,
  entryName,
  record,
  onGenerate,
  onCancel,
  errorMessage,
}: ShareLinkModalProps) {
  if (!record) return null;

  const [expireAt, setExpireAt] = useState<Dayjs | null>(
    dayjs().add(24, "hour"),
  );
  const [activePreset, setActivePreset] = useState<string | null>("24h");

  const ext = getExtensionFromContentType(record.contentType || "");
  const defaultFileName = `${entryName}-${record.key}${ext}`;

  const [fileName, setFileName] = useState(defaultFileName);
  const [link, setLink] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    setLink("");
    setFileName(defaultFileName);
    setExpireAt(dayjs().add(24, "hour"));
    setActivePreset("24h");
    onCancel();
  };

  const handleGenerate = async () => {
    if (!expireAt) return;
    setLoading(true);
    try {
      const generated = await onGenerate(expireAt.toDate(), fileName.trim());
      setLink(generated);
      message.success("Link generated successfully");
    } catch (err) {
      console.error("Failed to generate share link:", err);
      message.error("Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      message.success("Link copied to clipboard");
    } catch {
      message.error("Failed to copy link");
    }
  };

  const handlePresetClick = (preset: string) => {
    const config = PRESETS.find((p) => p.key === preset);
    if (!config) return;
    const newDate = dayjs().add(config.amount, config.add);
    setExpireAt(newDate);
    setActivePreset(preset);
  };

  const handleDateChange = (val: Dayjs | null) => {
    setExpireAt(val);
    setActivePreset(null);
  };

  return (
    <Modal
      open={open}
      closable={false}
      title={`Create shareable link for "${entryName}"`}
      data-testid="sharelink-modal"
      footer={[
        !link ? (
          <>
            <Button
              key="generate"
              type="primary"
              onClick={handleGenerate}
              loading={loading}
            >
              Generate Link
            </Button>
            <Button key="back" onClick={handleCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <Button key="close" type="primary" onClick={handleCancel}>
            Close
          </Button>
        ),
      ]}
    >
      <Flex vertical gap="small">
        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            data-testid="error-alert"
          />
        )}

        {!link ? (
          <Form layout="vertical">
            <Form.Item label="Expiry time">
              <Space direction="vertical" size="small">
                <Flex gap="small" wrap>
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.key}
                      data-testid={`preset-${preset.key}`}
                      type={activePreset === preset.key ? "primary" : "default"}
                      onClick={() => handlePresetClick(preset.key)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Flex>
                <DatePicker
                  showTime
                  value={expireAt}
                  onChange={handleDateChange}
                  data-testid="expiry-input"
                />
              </Space>
            </Form.Item>
            <Form.Item label="File name">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                data-testid="filename-input"
              />
            </Form.Item>
          </Form>
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text strong>Shareable Link:</Typography.Text>
            <Input value={link} readOnly data-testid="generated-link" />
            <Space>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopy}
                data-testid="copy-button"
              >
                Copy
              </Button>
              <Button
                icon={<LinkOutlined />}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open
              </Button>
            </Space>
            {expireAt && (
              <Typography.Text type="secondary">
                Expires at: {expireAt.format("YYYY-MM-DD HH:mm:ss")}
              </Typography.Text>
            )}
          </Space>
        )}
      </Flex>
    </Modal>
  );
}
