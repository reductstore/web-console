import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Space, Grid, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "../../Helpers/dayjsConfig";
import {
  getTimeRangeFromKey,
  RANGE_MAP,
  detectRangeKey,
} from "../../Helpers/timeRangeUtils";

type RangeValue = Parameters<
  NonNullable<React.ComponentProps<typeof DatePicker.RangePicker>["onChange"]>
>[0];

interface Props {
  onSelectRange: (start: bigint, end: bigint) => void;
  initialRangeKey?: string;
  currentRange?: { start: bigint | undefined; end: bigint | undefined };
}

export default function TimeRangeDropdown({
  onSelectRange,
  initialRangeKey,
  currentRange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rangeLabel, setRangeLabel] = useState<string | undefined>(
    initialRangeKey ? RANGE_MAP[initialRangeKey] : undefined,
  );
  const [tempDates, setTempDates] = useState<RangeValue>(null);

  const isMounted = useRef(true);
  const suppressNextOpen = useRef(false);

  const screens = Grid.useBreakpoint();
  const isSmall = !screens.md;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const detectedKey = detectRangeKey(currentRange?.start, currentRange?.end);
    setRangeLabel(RANGE_MAP[detectedKey]);
  }, [currentRange]);

  const presets = useMemo(
    () =>
      Object.entries(RANGE_MAP)
        .filter(([k]) => k !== "custom")
        .map(([key, label]) => {
          try {
            const r = getTimeRangeFromKey(key);
            const start = dayjs(Number(r.start / 1000n));
            const end = dayjs(Number(r.end / 1000n));
            return { key, label, value: [start, end] as [Dayjs, Dayjs] };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as {
        key: string;
        label: string;
        value: [Dayjs, Dayjs];
      }[],
    [],
  );

  const applyRange = (from: Dayjs, to: Dayjs) => {
    const start = BigInt(from.valueOf() * 1000);
    const end = BigInt(to.valueOf() * 1000);
    onSelectRange(start, end);
  };

  const handlePresetPick = (key: string) => {
    const preset = presets.find((p) => p.key === key);
    if (!preset) return;
    const [from, to] = preset.value;
    applyRange(from, to);
    setRangeLabel(preset.label);
  };

  const displayLabel = rangeLabel || "Select time range";

  const menuItems: MenuProps["items"] = presets.map((p) => ({
    key: p.key,
    label: p.label,
  }));

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      {isSmall ? (
        <Dropdown
          open={menuOpen}
          onOpenChange={(open) => setMenuOpen(open)}
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              handlePresetPick(String(key));
              setMenuOpen(false);
            },
          }}
          placement="bottomLeft"
          trigger={["click"]}
        >
          <Button onClick={() => setMenuOpen(true)}>
            {displayLabel}
            <DownOutlined />
          </Button>
        </Dropdown>
      ) : (
        <>
          <Button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPickerOpen((prev) => {
                if (prev) {
                  suppressNextOpen.current = true;
                  return false;
                }
                return true;
              });
            }}
          >
            {displayLabel}
            <DownOutlined />
          </Button>
          <Space
            direction="vertical"
            size={12}
            style={{
              position: "absolute",
              insetInlineStart: 0,
              top: 0,
              width: 1,
              height: 1,
              padding: 0,
              margin: 0,
              border: 0,
              opacity: 0,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <DatePicker.RangePicker
              open={pickerOpen}
              onOpenChange={(open) => {
                if (!isMounted.current) return;
                if (open && suppressNextOpen.current) {
                  suppressNextOpen.current = false;
                  return;
                }
                setPickerOpen(open);
                if (!open) setTempDates(null);
              }}
              value={tempDates}
              onCalendarChange={(vals) => {
                if (!isMounted.current) return;
                const v = vals as RangeValue;
                setTempDates(v);
              }}
              onChange={(dates) => {
                if (!isMounted.current) return;
                const from = dates?.[0] as Dayjs | null;
                const to = dates?.[1] as Dayjs | null;
                if (from && to) {
                  applyRange(from, to);
                  const key = detectRangeKey(
                    BigInt(from.valueOf() * 1000),
                    BigInt(to.valueOf() * 1000),
                  );
                  setRangeLabel(RANGE_MAP[key]);
                }
                setPickerOpen(false);
              }}
              presets={presets.map(({ label, value }) => ({ label, value }))}
              allowClear={false}
              showTime={false}
            />
          </Space>
        </>
      )}
    </div>
  );
}
