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
  const iconElProps = icon.props as Record<string, any>;
  const mergedStyle = {
    ...(iconElProps.style || {}),
    ...(disabled ? disabledStyle : {}),
  };
  const styledIcon = React.cloneElement(icon, {
    ...iconElProps,
    style: mergedStyle,
  } as Record<string, any>);

  const wrapperStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    cursor: disabled ? "not-allowed" : "pointer",
  };

  const handleClick = disabled ? undefined : onClick;

  const node = (
    <span style={wrapperStyle} onClick={handleClick}>
      {styledIcon}
    </span>
  );

  if (!tooltip) {
    return node;
  }

  if (!disabled && !showTooltipWhenEnabled) {
    return node;
  }

  return <Tooltip title={tooltip}>{node}</Tooltip>;
}
