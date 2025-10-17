import dayjs, { Dayjs } from "./dayjsConfig";

export interface TimeRange {
  start: bigint;
  end: bigint;
}

export const RANGE_MAP: Record<string, string> = {
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
  custom: "Custom range",
};

const getUtcDay = (date: Dayjs, type: "start" | "end") =>
  type === "start"
    ? dayjs(date.format("YYYY-MM-DD")).startOf("day")
    : dayjs(date.format("YYYY-MM-DD")).endOf("day");

/**
 * Calculate time range based on a preset key
 * @param key - The preset range key (e.g., 'last24', 'thisweek', etc.)
 * @param now - Optional reference time (defaults to current time)
 * @returns TimeRange object with start and end times as bigint microseconds
 */
export function getTimeRangeFromKey(
  key: string,
  now: Dayjs = dayjs(),
): TimeRange {
  const convertToMicroseconds = (date: Dayjs): bigint =>
    BigInt(date.valueOf() * 1000);

  switch (key) {
    case "last1":
      return {
        start: convertToMicroseconds(now.subtract(1, "hour")),
        end: convertToMicroseconds(now),
      };
    case "last6":
      return {
        start: convertToMicroseconds(now.subtract(6, "hour")),
        end: convertToMicroseconds(now),
      };
    case "last24":
      return {
        start: convertToMicroseconds(now.subtract(24, "hour")),
        end: convertToMicroseconds(now),
      };
    case "last7":
      return {
        start: convertToMicroseconds(now.subtract(7, "day")),
        end: convertToMicroseconds(now),
      };
    case "last30":
      return {
        start: convertToMicroseconds(now.subtract(30, "day")),
        end: convertToMicroseconds(now),
      };
    case "today":
      return {
        start: convertToMicroseconds(getUtcDay(now, "start")),
        end: convertToMicroseconds(getUtcDay(now, "end")),
      };
    case "yesterday": {
      const y = now.subtract(1, "day");
      return {
        start: convertToMicroseconds(getUtcDay(y, "start")),
        end: convertToMicroseconds(getUtcDay(y, "end")),
      };
    }
    case "thisweek": {
      const start = now.isoWeekday(1);
      const end = now.isoWeekday(7);
      return {
        start: convertToMicroseconds(getUtcDay(start, "start")),
        end: convertToMicroseconds(getUtcDay(end, "end")),
      };
    }
    case "lastweek": {
      const start = now.subtract(1, "week").isoWeekday(1);
      const end = now.subtract(1, "week").isoWeekday(7);
      return {
        start: convertToMicroseconds(getUtcDay(start, "start")),
        end: convertToMicroseconds(getUtcDay(end, "end")),
      };
    }
    case "thismonth":
      return {
        start: convertToMicroseconds(getUtcDay(now.startOf("month"), "start")),
        end: convertToMicroseconds(getUtcDay(now.endOf("month"), "end")),
      };
    case "lastmonth": {
      const m = now.subtract(1, "month");
      return {
        start: convertToMicroseconds(getUtcDay(m.startOf("month"), "start")),
        end: convertToMicroseconds(getUtcDay(m.endOf("month"), "end")),
      };
    }
    default:
      throw new Error(`Unknown time range key: ${key}`);
  }
}

/**
 * Get the default time range key used by the application
 */
export const DEFAULT_RANGE_KEY = "last7";

/**
 * Get the default time range using the default key
 */
export function getDefaultTimeRange(now: Dayjs = dayjs()): TimeRange {
  return getTimeRangeFromKey(DEFAULT_RANGE_KEY, now);
}

/**
 * Detect which preset range key matches the given start and end times
 * @param start - Start time in microseconds
 * @param end - End time in microseconds
 * @param marginMinutes - Margin of error in minutes (default: 5)
 * @param now - Optional reference time (defaults to current time)
 * @returns The matching range key or 'custom' if no match found
 */
export function detectRangeKey(
  start?: bigint,
  end?: bigint,
  marginMinutes = 10,
  now: Dayjs = dayjs(),
): string {
  if (start === undefined || end === undefined) {
    return "custom";
  }
  const marginMicroseconds = BigInt(marginMinutes * 60 * 1000 * 1000);
  const presetKeys = Object.keys(RANGE_MAP).filter((key) => key !== "custom");

  for (const key of presetKeys) {
    try {
      const expectedRange = getTimeRangeFromKey(key, now);

      const startDiff =
        start > expectedRange.start
          ? start - expectedRange.start
          : expectedRange.start - start;
      const endDiff =
        end > expectedRange.end
          ? end - expectedRange.end
          : expectedRange.end - end;

      if (startDiff <= marginMicroseconds && endDiff <= marginMicroseconds) {
        return key;
      }
    } catch (error) {
      continue;
    }
  }

  return "custom";
}
