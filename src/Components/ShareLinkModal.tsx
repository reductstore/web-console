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

  const ext = getExtensionFromContentType(record.contentType || "");
  const [fileName, setFileName] = useState(`${entryName}-${record.key}${ext}`);
  const [link, setLink] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    setLink("");
    setFileName(`${entryName}-${record.key}${record.ext}`);
    setExpireAt(dayjs().add(24, "hour"));
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
              <DatePicker
                showTime
                value={expireAt}
                onChange={(val) => setExpireAt(val)}
                data-testid="expiry-input"
              />
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
                Expires at: {expireAt.toISOString()}
              </Typography.Text>
            )}
          </Space>
        )}
      </Flex>
    </Modal>
  );
}
