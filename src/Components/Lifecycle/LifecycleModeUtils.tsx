import React from "react";
import { LifecycleMode } from "reduct-js";
import {
  CheckCircleOutlined,
  ExperimentOutlined,
  StopOutlined,
} from "@ant-design/icons";

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
