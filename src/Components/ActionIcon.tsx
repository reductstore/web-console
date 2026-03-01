import React from "react";
import { Tooltip } from "antd";

const defaultDisabledStyle: React.CSSProperties = {
  color: "#bfbfbf",
  cursor: "not-allowed",
};

interface ActionIconProps {
  icon: React.ReactElement;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  tooltip?: string;
  disabledStyle?: React.CSSProperties;
  showTooltipWhenEnabled?: boolean;
}

export default function ActionIcon({
  icon,
  onClick,
  disabled = false,
  tooltip,
  disabledStyle = defaultDisabledStyle,
  showTooltipWhenEnabled = false,
}: ActionIconProps) {
  const iconProps = {
    ...icon.props,
    onClick: disabled ? undefined : onClick,
    style: {
      ...(icon.props.style || {}),
      ...(disabled ? disabledStyle : {}),
    },
  };
  const iconNode = React.cloneElement(icon, iconProps);

  if (!tooltip) {
    return iconNode;
  }

  if (!disabled && !showTooltipWhenEnabled) {
    return iconNode;
  }

  return (
    <Tooltip title={tooltip}>
      <span>{iconNode}</span>
    </Tooltip>
  );
}
