import React, { useState, useEffect } from "react";
import { Button, Dropdown, DatePicker } from "antd";
import { DownOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

interface Props {
  onSelectRange: (start: bigint, end: bigint) => void;
}

export default function TimeRangeDropdown({ onSelectRange }: Props) {
  const [visible, setVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

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

  const handlePresetRange = (key: string) => {
    const now = dayjs();
    switch (key) {
      case "last7":
        applyRange(now.subtract(7, "day"), now);
        break;
      case "last30":
        applyRange(now.subtract(30, "day"), now);
        break;
      case "today":
        applyRange(now.startOf("day"), now.endOf("day"));
        break;
      case "yesterday": {
        const y = now.subtract(1, "day");
        applyRange(y.startOf("day"), y.endOf("day"));
        break;
      }
      case "thisweek":
        applyRange(now.startOf("week"), now.endOf("week"));
        break;
      case "lastweek": {
        const w = now.subtract(1, "week");
        applyRange(w.startOf("week"), w.endOf("week"));
        break;
      }
      case "thismonth":
        applyRange(now.startOf("month"), now.endOf("month"));
        break;
      case "lastmonth": {
        const m = now.subtract(1, "month");
        applyRange(m.startOf("month"), m.endOf("month"));
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
                applyRange(dates[0].startOf("day"), dates[1].endOf("day"));
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
          { key: "last7", label: "Last 7 days" },
          { key: "last30", label: "Last 30 days" },
          { key: "today", label: "Today" },
          { key: "yesterday", label: "Yesterday" },
          { key: "thisweek", label: "This week" },
          { key: "lastweek", label: "Last week" },
          { key: "thismonth", label: "This month" },
          { key: "lastmonth", label: "Last month" },
          customDateMenuItem,
        ],
      }}
    >
      <Button>
        Select time range <DownOutlined />
      </Button>
    </Dropdown>
  );
}
