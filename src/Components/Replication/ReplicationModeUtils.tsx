import React from "react";
import { ReplicationMode } from "reduct-js";
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

export const getModeIcon = (mode: ReplicationMode): React.ReactNode => {
  switch (mode) {
    case ReplicationMode.ENABLED:
      return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
    case ReplicationMode.PAUSED:
      return <PauseCircleOutlined style={{ color: "#faad14" }} />;
    case ReplicationMode.DISABLED:
      return <StopOutlined style={{ color: "#ff4d4f" }} />;
    default:
      return null;
  }
};

export const MODE_SELECT_OPTIONS = [
  {
    value: ReplicationMode.ENABLED,
    label: (
      <span>
        <CheckCircleOutlined style={{ color: "#52c41a" }} /> Enabled
      </span>
    ),
  },
  {
    value: ReplicationMode.PAUSED,
    label: (
      <span>
        <PauseCircleOutlined style={{ color: "#faad14" }} /> Paused
      </span>
    ),
  },
  {
    value: ReplicationMode.DISABLED,
    label: (
      <span>
        <StopOutlined style={{ color: "#ff4d4f" }} /> Disabled
      </span>
    ),
  },
];

export const MODE_SELECT_STYLE = { minWidth: 120 };
