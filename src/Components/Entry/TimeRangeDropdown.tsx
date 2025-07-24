import React, { useState, useEffect } from "react";
import { Button, Dropdown, DatePicker } from "antd";
import { DownOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(utc);
dayjs.extend(isoWeek);

interface Props {
  onSelectRange: (start: bigint, end: bigint) => void;
}

const RANGE_MAP: Record<string, string> = {
  last1: "Last 1 hour",
  last6: "Last 6 hours",
  last24: "Last 24 hours",
  last7: "Last 7 days",
  last30: "Last 30 days",
  today: "Today",
  yesterday: "Yesterday",
  thisweek: "This week",
  lastweek: "Last week",
  thismonth: "This month",
  lastmonth: "Last month",
};

export default function TimeRangeDropdown({ onSelectRange }: Props) {
  const [visible, setVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [currentRange, setCurrentRange] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => {
      setVisible(panelVisible);
    }, 10);
  }, [panelVisible]);

  const applyRange = (from: Dayjs, to: Dayjs) => {
    const start = BigInt(from.valueOf() * 1000);
    const end = BigInt(to.valueOf() * 1000);
    onSelectRange(start, end);
  };

  const getUtcDay = (date: Dayjs, type: "start" | "end") =>
    type === "start"
      ? dayjs.utc(date.format("YYYY-MM-DD")).startOf("day")
      : dayjs.utc(date.format("YYYY-MM-DD")).endOf("day");

  const handlePresetRange = (key: string) => {
    setCurrentRange(RANGE_MAP[key]);
    const now = dayjs();
    switch (key) {
      case "last1":
        applyRange(now.subtract(1, "hour"), now);
        break;
      case "last6":
        applyRange(now.subtract(6, "hour"), now);
        break;
      case "last24":
        applyRange(now.subtract(24, "hour"), now);
        break;
      case "last7":
        applyRange(now.subtract(7, "day"), now);
        break;
      case "last30":
        applyRange(now.subtract(30, "day"), now);
        break;
      case "today":
        applyRange(getUtcDay(now, "start"), getUtcDay(now, "end"));
        break;
      case "yesterday": {
        const y = now.subtract(1, "day");
        applyRange(getUtcDay(y, "start"), getUtcDay(y, "end"));
        break;
      }
      case "thisweek": {
        const start = dayjs().isoWeekday(1);
        const end = dayjs().isoWeekday(7);
        applyRange(getUtcDay(start, "start"), getUtcDay(end, "end"));
        break;
      }
      case "lastweek": {
        const start = dayjs().subtract(1, "week").isoWeekday(1);
        const end = dayjs().subtract(1, "week").isoWeekday(7);
        applyRange(getUtcDay(start, "start"), getUtcDay(end, "end"));
        break;
      }
      case "thismonth":
        applyRange(
          getUtcDay(now.startOf("month"), "start"),
          getUtcDay(now.endOf("month"), "end"),
        );
        break;
      case "lastmonth": {
        const m = now.subtract(1, "month");
        applyRange(
          getUtcDay(m.startOf("month"), "start"),
          getUtcDay(m.endOf("month"), "end"),
        );
        break;
      }
      case "custom":
        setPanelVisible(!panelVisible);
        break;
    }
  };

  const customDateMenuItem = {
    key: "custom",
    label: (
      <div
        style={{ position: "relative", overflow: "hidden" }}
        onClick={(e) => {
          e.stopPropagation();
          setPanelVisible(true);
        }}
      >
        <div>Customize</div>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <DatePicker.RangePicker
            open={panelVisible}
            style={{
              pointerEvents: "none",
              opacity: 0,
              position: "absolute",
              bottom: -12,
              insetInlineStart: 0,
            }}
            onChange={(dates) => {
              if (dates?.[0] && dates?.[1]) {
                const from = getUtcDay(dates[0], "start");
                const to = getUtcDay(dates[1], "end");
                applyRange(from, to);
                setPanelVisible(false);
              }
            }}
          />
        </div>
      </div>
    ),
  };

  return (
    <Dropdown
      arrow
      open={visible}
      trigger={["click"]}
      destroyOnHidden
      onOpenChange={(open) => {
        setVisible(open);
        if (!open) {
          setPanelVisible(false);
        }
      }}
      menu={{
        onClick: (e) => handlePresetRange(e.key),
        items: [
          ...Object.entries(RANGE_MAP).map(([key, label]) => ({ key, label })),
          customDateMenuItem,
        ],
      }}
    >
      <Button>
        {currentRange === null ? "Select time range" : currentRange}{" "}
        <DownOutlined />
      </Button>
    </Dropdown>
  );
}
