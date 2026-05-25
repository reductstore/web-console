import React from "react";
import {
  CloudDownloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Progress, theme } from "antd";
import type { QueryStatus } from "../../hooks/useQueryProgress";

export type { QueryStatus };

interface QueryStatusLabelProps {
  status: QueryStatus;
  recordCount: number;
  elapsed?: string | null;
  eta?: string | null;
}

export function QueryStatusLabel({
  status,
  recordCount,
  elapsed,
  eta,
}: Readonly<QueryStatusLabelProps>) {
  const { token } = theme.useToken();
  const color = token.colorPrimary;

  if (status === "idle") return null;

  const label =
    status === "done" ? "Done" : status === "stopped" ? "Stopped" : "Fetching";

  const icon =
    status === "done" ? (
      <CheckCircleOutlined />
    ) : status === "stopped" ? (
      <StopOutlined />
    ) : (
      <CloudDownloadOutlined />
    );

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 13,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {icon} {label}
      {elapsed && (
        <span style={{ color: token.colorTextSecondary }}>· {elapsed}</span>
      )}
      {eta && status === "fetching" && (
        <span style={{ color: token.colorTextSecondary }}>· ETA {eta}</span>
      )}
      {recordCount > 0 && (
        <span style={{ color: token.colorTextSecondary }}>
          · {recordCount.toLocaleString()} record{recordCount !== 1 ? "s" : ""}
        </span>
      )}
    </span>
  );
}

interface QueryProgressBarProps {
  status: QueryStatus;
  percent: number;
}

export function QueryProgressBar({
  status,
  percent,
}: Readonly<QueryProgressBarProps>) {
  const { token } = theme.useToken();
  const color = token.colorPrimary;

  if (status === "idle") return null;

  return (
    <div style={{ width: "100%", paddingTop: 10, paddingBottom: 5 }}>
      <Progress
        percent={Math.min(Math.round(percent), 100)}
        strokeColor={color}
        size="small"
        styles={{ indicator: { color } }}
      />
    </div>
  );
}
