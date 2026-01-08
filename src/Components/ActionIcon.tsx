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
}

export default function ActionIcon({
  icon,
  onClick,
  disabled = false,
  tooltip,
  disabledStyle = defaultDisabledStyle,
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

  if (!disabled) {
    return iconNode;
  }

  return (
    <Tooltip title={tooltip}>
      <span>{iconNode}</span>
    </Tooltip>
  );
}
