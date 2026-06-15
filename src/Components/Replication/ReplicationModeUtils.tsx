import React from "react";
import { ReplicationMode } from "reduct-js";
import {
  CheckCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { ModeOption } from "../ModeDropdown";

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

export interface ReplicationStatus {
  status: "processing" | "warning" | "error" | "default";
  text: string;
  /** Theme token to colour the badge dot, resolved at render via useToken. */
  colorToken?: "colorPrimary" | "colorInfo";
}

export const getReplicationStatus = (
  mode: ReplicationMode,
  isActive: boolean,
): ReplicationStatus => {
  if (mode === ReplicationMode.DISABLED) {
    return { status: "default", text: "Disabled" };
  }

  if (mode === ReplicationMode.PAUSED) {
    return { status: "warning", text: "Paused" };
  }

  if (!isActive) {
    return { status: "error", text: "Target Unreachable" };
  }

  return { status: "processing", colorToken: "colorPrimary", text: "Running" };
};

export const MODE_DROPDOWN_OPTIONS: ModeOption<ReplicationMode>[] = [
  {
    value: ReplicationMode.ENABLED,
    actionLabel: "Enable",
    icon: getModeIcon(ReplicationMode.ENABLED),
  },
  {
    value: ReplicationMode.PAUSED,
    actionLabel: "Pause",
    icon: getModeIcon(ReplicationMode.PAUSED),
  },
  {
    value: ReplicationMode.DISABLED,
    actionLabel: "Disable",
    icon: getModeIcon(ReplicationMode.DISABLED),
  },
];
