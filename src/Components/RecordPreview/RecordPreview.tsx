import React, { useState, useEffect } from "react";
import { Button, Typography, Image, Spin, Alert, Card } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { Bucket } from "reduct-js";

import "./RecordPreview.css";

interface RecordPreviewProps {
  contentType: string;
  size: number;
  fileName: string;
  entryName: string;
  timestamp: bigint;
  bucket: Bucket;
}

const MAX_TEXT_SIZE = 1024 * 1024; // 1MB limit for text preview
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB limit for image preview

const isImageType = (contentType: string): boolean => {
  return contentType.startsWith("image/");
};

const isTextType = (contentType: string): boolean => {
  return (
    contentType.startsWith("text/") ||
    contentType === "application/json" ||
    contentType === "application/xml" ||
    contentType === "application/javascript" ||
    contentType.includes("xml") ||
    contentType.includes("json")
  );
};

const RecordPreview: React.FC<RecordPreviewProps> = ({
  contentType,
  size,
  fileName,
  entryName,
  timestamp,
  bucket,
}) => {
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPreview = (): boolean => {
    if (isImageType(contentType)) {
      return size <= MAX_IMAGE_SIZE;
    }
    if (isTextType(contentType)) {
      return size <= MAX_TEXT_SIZE;
    }
    return false;
  };

  const fetchPreview = async () => {
    if (!canPreview()) {
      setError("File too large or unsupported format for preview");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const expireAt = new Date(Date.now() + 60 * 60 * 1000);
      const generatedQueryLink = await bucket.createQueryLink(
        entryName,
        timestamp,
        undefined,
        undefined,
        0,
        expireAt,
        fileName,
      );

      if (isImageType(contentType)) {
        setPreviewContent(generatedQueryLink);
      } else if (isTextType(contentType)) {
        const response = await fetch(generatedQueryLink);
        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.statusText}`);
        }
        const text = await response.text();
        setPreviewContent(text);
      }
    } catch (err) {
      console.error("Preview fetch failed", err);
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreview = () => {
    if (!isPreviewVisible) {
      setIsPreviewVisible(true);
      if (!previewContent && !error) {
        fetchPreview();
      }
    } else {
      setIsPreviewVisible(false);
    }
  };

  useEffect(() => {
    if (canPreview() && !previewContent && !error) {
      fetchPreview();
    }
  }, []);

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="previewLoading">
          <Spin size="large" />
          <Typography.Text>Loading preview...</Typography.Text>
        </div>
      );
    }

    if (error) {
      return <Alert type="error" message={error} showIcon />;
    }

    if (!previewContent) {
      return null;
    }

    if (isImageType(contentType)) {
      return (
        <div className="previewImageContainer">
          <Image
            src={previewContent}
            alt={fileName}
            style={{ maxWidth: "100%", maxHeight: "400px" }}
            placeholder={
              <div className="imagePlaceholder">
                <Spin size="large" />
              </div>
            }
          />
        </div>
      );
    }

    if (isTextType(contentType)) {
      return (
        <div className="previewTextContainer">
          <pre className="previewText">{previewContent}</pre>
        </div>
      );
    }

    return null;
  };

  if (!canPreview()) {
    return (
      <Card size="small" className="recordPreviewCard">
        <Typography.Text type="secondary">
          Preview not available for this file type or size
        </Typography.Text>
      </Card>
    );
  }

  return (
    <Card size="small" className="recordPreviewCard">
      <div className="previewHeader">
        <Typography.Text strong>Content Preview</Typography.Text>
        <Button
          type="text"
          size="small"
          icon={isPreviewVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={togglePreview}
        >
          {isPreviewVisible ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>
      {isPreviewVisible && (
        <div className="previewContent">{renderPreviewContent()}</div>
      )}
    </Card>
  );
};

export default RecordPreview;
