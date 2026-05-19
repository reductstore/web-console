import React from "react";
import {
  CloudDownloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Progress, theme } from "antd";

export type QueryStatus = "idle" | "fetching" | "done" | "cancelled" | "error";

interface QueryStatusLabelProps {
  status: QueryStatus;
  recordCount: number;
}

export function QueryStatusLabel({
  status,
  recordCount,
}: Readonly<QueryStatusLabelProps>) {
  const { token } = theme.useToken();
  const color = token.colorPrimary;

  if (status === "idle" || status === "error") return null;

  const label =
    status === "done"
      ? "Done"
      : status === "cancelled"
        ? "Cancelled"
        : "Fetching";

  const icon =
    status === "done" ? (
      <CheckCircleOutlined />
    ) : status === "cancelled" ? (
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
      {recordCount > 0 && (
        <span style={{ color: "rgba(0, 0, 0, 0.45)" }}>
          · {recordCount} record{recordCount !== 1 ? "s" : ""}
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

  if (status === "idle" || status === "error") return null;

  return (
    <div style={{ width: "100%", paddingTop: 5 }}>
      <Progress
        percent={Math.min(Math.round(percent), 100)}
        strokeColor={color}
        size="small"
        styles={{ indicator: { color } }}
      />
    </div>
  );
}
