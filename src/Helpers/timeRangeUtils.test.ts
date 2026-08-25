import dayjs from "dayjs";
import {
  getTimeRangeFromKey,
  getDefaultTimeRange,
  DEFAULT_RANGE_KEY,
  RANGE_MAP,
  detectRangeKey,
} from "./timeRangeUtils";

describe("timeRangeUtils", () => {
  const mockNow = dayjs("2023-10-15T12:00:00Z");

  describe("getTimeRangeFromKey", () => {
    it.each([
      ["last5m", 5],
      ["last15m", 15],
      ["last30m", 30],
    ])("should calculate %s in minutes correctly", (key, minutes) => {
      const result = getTimeRangeFromKey(key, mockNow);

      expect(result.start).toBe(
        BigInt(mockNow.subtract(minutes, "minute").valueOf() * 1000),
      );
      expect(result.end).toBe(BigInt(mockNow.valueOf() * 1000));
    });

    it("should calculate last1 range correctly", () => {
      const result = getTimeRangeFromKey("last1", mockNow);
      const expectedStart = BigInt(
        mockNow.subtract(1, "hour").valueOf() * 1000,
      );
      const expectedEnd = BigInt(mockNow.valueOf() * 1000);

      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it("should calculate last24 range correctly", () => {
      const result = getTimeRangeFromKey("last24", mockNow);
      const expectedStart = BigInt(
        mockNow.subtract(24, "hour").valueOf() * 1000,
      );
      const expectedEnd = BigInt(mockNow.valueOf() * 1000);

      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it("should calculate today range correctly", () => {
      const result = getTimeRangeFromKey("today", mockNow);
      const expectedStart = BigInt(
        dayjs("2023-10-15").startOf("day").valueOf() * 1000,
      );
      const expectedEnd = BigInt(
        dayjs("2023-10-15").endOf("day").valueOf() * 1000,
      );

      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it("should calculate thisweek range correctly", () => {
      const result = getTimeRangeFromKey("thisweek", mockNow);
      // Oct 15, 2023 is a Sunday, so the week starts on Oct 9 (Monday) and ends on Oct 15 (Sunday)
      const weekStart = mockNow.isoWeekday(1); // Monday
      const weekEnd = mockNow.isoWeekday(7); // Sunday
      const expectedStart = BigInt(
        dayjs(weekStart.format("YYYY-MM-DD")).startOf("day").valueOf() * 1000,
      );
      const expectedEnd = BigInt(
        dayjs(weekEnd.format("YYYY-MM-DD")).endOf("day").valueOf() * 1000,
      );

      expect(result.start).toBe(expectedStart);
      expect(result.end).toBe(expectedEnd);
    });

    it("should throw error for unknown key", () => {
      expect(() => getTimeRangeFromKey("unknown")).toThrow(
        "Unknown time range key: unknown",
      );
    });
  });

  describe("getDefaultTimeRange", () => {
    it("should return the same as last1 range", () => {
      const defaultRange = getDefaultTimeRange(mockNow);
      const last1Range = getTimeRangeFromKey("last1", mockNow);

      expect(defaultRange.start).toBe(last1Range.start);
      expect(defaultRange.end).toBe(last1Range.end);
    });
  });

  describe("DEFAULT_RANGE_KEY", () => {
    it("should be last1", () => {
      expect(DEFAULT_RANGE_KEY).toBe("last1");
    });
  });

  describe("RANGE_MAP", () => {
    it("should contain all expected range keys", () => {
      const expectedKeys = [
        "last5m",
        "last15m",
        "last30m",
        "last1",
        "last6",
        "last24",
        "last7",
        "last30",
        "today",
        "yesterday",
        "thisweek",
        "lastweek",
        "thismonth",
        "lastmonth",
        "custom",
      ];

      expect(Object.keys(RANGE_MAP)).toEqual(expectedKeys);
    });
  });

  describe("detectRangeKey", () => {
    it.each(["last5m", "last15m", "last30m"])(
      "should detect an exact %s range",
      (key) => {
        const range = getTimeRangeFromKey(key, mockNow);

        expect(detectRangeKey(range.start, range.end, 10, mockNow)).toBe(key);
      },
    );

    it("should detect exact matches for preset ranges", () => {
      const last24Range = getTimeRangeFromKey("last24", mockNow);
      const detectedKey = detectRangeKey(
        last24Range.start,
        last24Range.end,
        5,
        mockNow,
      );
      expect(detectedKey).toBe("last24");
    });

    it("should detect matches within margin of error", () => {
      const last1Range = getTimeRangeFromKey("last1", mockNow);
      // Add 2 minutes to end time (within 5 minute margin)
      const adjustedEnd = last1Range.end + BigInt(2 * 60 * 1000 * 1000);
      const detectedKey = detectRangeKey(
        last1Range.start,
        adjustedEnd,
        5,
        mockNow,
      );
      expect(detectedKey).toBe("last1");
    });

    it("should select the nearest preset within the margin", () => {
      const last15Range = getTimeRangeFromKey("last15m", mockNow);
      const adjustedStart = last15Range.start + 4n * 60n * 1_000_000n;

      expect(detectRangeKey(adjustedStart, last15Range.end, 10, mockNow)).toBe(
        "last15m",
      );
    });

    it("should return 'custom' for equally close preset matches", () => {
      const end = BigInt(mockNow.valueOf() * 1000);
      const start = BigInt(mockNow.subtract(10, "minute").valueOf() * 1000);

      expect(detectRangeKey(start, end, 10, mockNow)).toBe("custom");
    });

    it("should return 'custom' for ranges outside margin of error", () => {
      const last24Range = getTimeRangeFromKey("last24", mockNow);
      // Add 10 minutes to end time (outside 5 minute margin)
      const adjustedEnd = last24Range.end + BigInt(10 * 60 * 1000 * 1000);
      const detectedKey = detectRangeKey(
        last24Range.start,
        adjustedEnd,
        5,
        mockNow,
      );
      expect(detectedKey).toBe("custom");
    });

    it("should return 'custom' for completely different ranges", () => {
      const start = BigInt(dayjs("2023-01-01").valueOf() * 1000);
      const end = BigInt(dayjs("2023-01-02").valueOf() * 1000);
      const detectedKey = detectRangeKey(start, end, 5, mockNow);
      expect(detectedKey).toBe("custom");
    });

    it("should detect today range correctly", () => {
      const todayRange = getTimeRangeFromKey("today", mockNow);
      const detectedKey = detectRangeKey(
        todayRange.start,
        todayRange.end,
        5,
        mockNow,
      );
      expect(detectedKey).toBe("today");
    });

    it("should detect thisweek range correctly", () => {
      const thisweekRange = getTimeRangeFromKey("thisweek", mockNow);
      const detectedKey = detectRangeKey(
        thisweekRange.start,
        thisweekRange.end,
        5,
        mockNow,
      );
      expect(detectedKey).toBe("thisweek");
    });
  });
});
