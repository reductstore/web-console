import React from "react";
import { Dropdown, Tooltip } from "antd";

export interface ModeOption<M extends string> {
  value: M;
  /** Label shown in the dropdown menu, e.g. "Enable", "Pause", "Dry Run". */
  actionLabel: string;
  icon: React.ReactNode;
}

interface ModeDropdownProps<M extends string> {
  mode: M;
  options: ModeOption<M>[];
  onChange: (mode: M) => void;
  disabled?: boolean;
  /** Icon size. Defaults to inheriting the surrounding font size. */
  fontSize?: number | string;
}

/**
 * Clickable mode icon that opens a dropdown to switch a resource's mode.
 */
export default function ModeDropdown<M extends string>({
  mode,
  options,
  onChange,
  disabled = false,
  fontSize,
}: ModeDropdownProps<M>) {
  const items = options.map((opt) => ({
    key: opt.value,
    icon: opt.icon,
    label:
      opt.value === mode ? (
        <span style={{ fontWeight: 600 }}>{opt.actionLabel} (current)</span>
      ) : (
        opt.actionLabel
      ),
    disabled: opt.value === mode,
  }));

  const currentIcon = options.find((opt) => opt.value === mode)?.icon ?? null;

  return (
    <Tooltip title="Change mode">
      <Dropdown
        menu={{ items, onClick: ({ key }) => onChange(key as M) }}
        trigger={["click"]}
        disabled={disabled}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize,
          }}
          title="Change mode"
        >
          {currentIcon}
        </span>
      </Dropdown>
    </Tooltip>
  );
}
