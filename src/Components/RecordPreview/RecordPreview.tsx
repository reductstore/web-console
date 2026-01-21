import React, { useState, useEffect } from "react";
import { Button, Typography, Image, Spin, Alert, Card } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { Bucket, QueryOptions } from "reduct-js";

import "./RecordPreview.css";

interface RecordPreviewProps {
  contentType: string;
  size: number;
  fileName: string;
  entryName: string;
  timestamp: bigint;
  queryStart?: bigint;
  queryEnd?: bigint;
  queryOptions?: QueryOptions;
  recordIndex?: number;
  bucket: Bucket;
  apiUrl: string;
}

const MAX_LOAD_SIZE = 10 * 1024 * 1024; // 10 MB limit for loading preview
const AUTO_PREVIEW_SIZE = 1 * 1024 * 1024; // 1 MB limit for auto preview

const isImageType = (contentType: string): boolean => {
  return contentType.startsWith("image/");
};

const isTextType = (contentType: string): boolean => {
  if (!contentType) return false;
  const type = contentType.toLowerCase().split(";")[0].trim();
  return (
    type.startsWith("text/") ||
    ["application/json", "application/xml"].includes(type) ||
    type.endsWith("+json") ||
    type.endsWith("+xml")
  );
};

const RecordPreview: React.FC<RecordPreviewProps> = ({
  contentType,
  size,
  fileName,
  entryName,
  timestamp,
  queryStart,
  queryEnd,
  queryOptions,
  recordIndex,
  bucket,
  apiUrl,
}) => {
  const shouldAutoPreview = size <= AUTO_PREVIEW_SIZE;
  const [isPreviewVisible, setIsPreviewVisible] = useState(shouldAutoPreview);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPreview = (): boolean => {
    if (isImageType(contentType)) {
      return size <= MAX_LOAD_SIZE;
    }
    if (isTextType(contentType)) {
      return size <= MAX_LOAD_SIZE;
    }
    return false;
  };

  const getUnavailableReason = (): string => {
    if (isImageType(contentType) && size > MAX_LOAD_SIZE) {
      return `Image size exceeds ${MAX_LOAD_SIZE / (1024 * 1024)} MB limit for preview`;
    }
    if (isTextType(contentType) && size > MAX_LOAD_SIZE) {
      return `Text size exceeds ${MAX_LOAD_SIZE / (1024 * 1024)} MB limit for preview`;
    }
    return `Format is not supported for preview`;
  };

  const fetchPreview = async (abortSignal?: AbortSignal) => {
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
        queryStart ?? timestamp,
        queryEnd,
        queryOptions,
        recordIndex ?? 0,
        expireAt,
        fileName,
        apiUrl,
      );
      if (abortSignal?.aborted) {
        return;
      }

      if (isImageType(contentType)) {
        setPreviewContent(generatedQueryLink);
      } else if (isTextType(contentType)) {
        const response = await fetch(generatedQueryLink, {
          signal: abortSignal,
        });

        if (abortSignal?.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch preview: ${response.statusText}`);
        }
        const text = await response.text();

        if (abortSignal?.aborted) {
          return;
        }

        setPreviewContent(text);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Preview fetch failed", err);
      setError(err instanceof Error ? err.message : "Failed to load preview");
    } finally {
      if (!abortSignal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  const togglePreview = () => {
    if (!isPreviewVisible) {
      setIsPreviewVisible(true);
      if (!previewContent && !error) {
        const abortController = new AbortController();
        fetchPreview(abortController.signal);
      }
    } else {
      setIsPreviewVisible(false);
    }
  };

  useEffect(() => {
    if (canPreview() && shouldAutoPreview && !previewContent && !error) {
      const abortController = new AbortController();
      fetchPreview(abortController.signal);

      return () => {
        abortController.abort();
      };
    }
  }, []);

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="previewLoading">
          <Spin />
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
          {getUnavailableReason()}
        </Typography.Text>
      </Card>
    );
  }

  const showSizeWarning = !isPreviewVisible && !shouldAutoPreview;

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
      {showSizeWarning && (
        <Typography.Text type="secondary">
          Content larger than {(AUTO_PREVIEW_SIZE / (1024 * 1024)).toFixed(1)}{" "}
          MB. Click "Show Preview" to load.
        </Typography.Text>
      )}
      {isPreviewVisible && (
        <div className="previewContent">{renderPreviewContent()}</div>
      )}
    </Card>
  );
};

export default RecordPreview;
