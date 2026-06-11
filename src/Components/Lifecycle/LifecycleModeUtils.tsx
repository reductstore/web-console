import React from "react";
import { LifecycleMode, LifecycleType } from "reduct-js";
import {
  CheckCircleOutlined,
  ExperimentOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { ModeOption } from "../ModeDropdown";

export const LIFECYCLE_TYPE_OPTIONS = [
  { value: LifecycleType.DELETE, label: "Delete" },
  { value: LifecycleType.COMPRESS, label: "Compress" },
];

export const getLifecycleTypeColor = (type?: LifecycleType): string => {
  switch (type) {
    case LifecycleType.COMPRESS:
      return "blue";
    case LifecycleType.DELETE:
    default:
      return "red";
  }
};

export const getModeIcon = (mode: LifecycleMode): React.ReactNode => {
  switch (mode) {
    case LifecycleMode.ENABLED:
      return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
    case LifecycleMode.DRY_RUN:
      return <ExperimentOutlined style={{ color: "#1677ff" }} />;
    case LifecycleMode.DISABLED:
      return <StopOutlined style={{ color: "#ff4d4f" }} />;
    default:
      return null;
  }
};

export const MODE_SELECT_OPTIONS = [
  {
    value: LifecycleMode.ENABLED,
    label: (
      <span>
        <CheckCircleOutlined style={{ color: "#52c41a" }} /> Enabled
      </span>
    ),
  },
  {
    value: LifecycleMode.DRY_RUN,
    label: (
      <span>
        <ExperimentOutlined style={{ color: "#1677ff" }} /> Dry Run
      </span>
    ),
  },
  {
    value: LifecycleMode.DISABLED,
    label: (
      <span>
        <StopOutlined style={{ color: "#ff4d4f" }} /> Disabled
      </span>
    ),
  },
];

export const MODE_SELECT_STYLE = { minWidth: 120 };

export interface LifecycleStatus {
  status: "processing" | "warning" | "default";
  text: string;
  colorToken?: "colorPrimary" | "colorInfo";
}

export const getLifecycleStatus = (
  mode: LifecycleMode,
  isRunning: boolean,
): LifecycleStatus => {
  if (mode === LifecycleMode.DISABLED) {
    return { status: "default", text: "Disabled" };
  }

  const isDryRun = mode === LifecycleMode.DRY_RUN;

  if (isRunning) {
    return {
      status: "processing",
      colorToken: isDryRun ? "colorInfo" : "colorPrimary",
      text: isDryRun ? "Dry Running" : "Running",
    };
  }

  return { status: "warning", text: isDryRun ? "Idle (Dry Run)" : "Idle" };
};

export const MODE_DROPDOWN_OPTIONS: ModeOption<LifecycleMode>[] = [
  {
    value: LifecycleMode.ENABLED,
    actionLabel: "Enable",
    icon: getModeIcon(LifecycleMode.ENABLED),
  },
  {
    value: LifecycleMode.DRY_RUN,
    actionLabel: "Dry Run",
    icon: getModeIcon(LifecycleMode.DRY_RUN),
  },
  {
    value: LifecycleMode.DISABLED,
    actionLabel: "Disable",
    icon: getModeIcon(LifecycleMode.DISABLED),
  },
];
