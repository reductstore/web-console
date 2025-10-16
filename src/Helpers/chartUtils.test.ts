import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import {
  pickBucketSizeMs,
  pickEachTInterval,
  lowerBoundByTime,
  upperBoundByTime,
  binRecords,
} from "./chartUtils";

describe("chartUtils", () => {
  describe("pickEachTInterval", () => {
    it("should return null for very small ranges", () => {
      expect(pickEachTInterval(1000)).toBe(null);
      expect(pickEachTInterval(5000)).toBe(null);
    });

    it("should return null or ms for medium ranges", () => {
      expect(pickEachTInterval(60_000)).toBe("500ms");
      expect(pickEachTInterval(600_000)).toBe("5s");
    });

    it("should handle hour ranges based on minimum interval", () => {
      expect(pickEachTInterval(3_600_000)).toBe("30s");
      expect(pickEachTInterval(7_200_000)).toBe("1m");
    });

    it("should return minutes for day ranges", () => {
      expect(pickEachTInterval(86_400_000)).toBe("15m");
      expect(pickEachTInterval(172_800_000)).toBe("30m");
    });

    it("should return intervals for ranges above minimum threshold", () => {
      expect(pickEachTInterval(5_000_000)).toBe("1m");
      expect(pickEachTInterval(10_000_000)).toBe("2m");
    });

    it("should return minutes for large ranges", () => {
      expect(pickEachTInterval(604_800_000)).toBe("2h");
      expect(pickEachTInterval(2_592_000_000)).toBe("6h");
    });

    it("should handle custom target records", () => {
      const result1 = pickEachTInterval(100_000, 20);
      expect(result1).toBe("5s");

      const result2 = pickEachTInterval(100_000, 5);
      expect(result2).toBe("15s");
    });

    it("should respect minimum interval", () => {
      expect(pickEachTInterval(500, 1000, 5000)).toBe(null);
    });

    it("should handle invalid inputs", () => {
      expect(pickEachTInterval(0)).toBe(null);
      expect(pickEachTInterval(-100)).toBe(null);
      expect(pickEachTInterval(NaN)).toBe(null);
      expect(pickEachTInterval(Infinity)).toBe(null);
    });

    it("should return nice round intervals", () => {
      expect(pickEachTInterval(10_000_000)).toBe("2m");
      expect(pickEachTInterval(300_000_000)).toBe("1h");
      expect(pickEachTInterval(1_800_000_000)).toBe("6h");
    });

    it("should handle 7-day default case", () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const result = pickEachTInterval(sevenDaysMs);
      expect(result).toBe("2h");
    });
  });

  describe("pickBucketSizeMs", () => {
    it("should return minBucketMs for invalid ranges", () => {
      expect(pickBucketSizeMs(0)).toBe(1000);
      expect(pickBucketSizeMs(-100)).toBe(1000);
      expect(pickBucketSizeMs(Infinity)).toBe(1000);
      expect(pickBucketSizeMs(NaN)).toBe(1000);
    });

    it("should respect minimum bucket size", () => {
      expect(pickBucketSizeMs(100, 150, 2000)).toBe(2000);
    });

    it("should respect maximum bucket size", () => {
      expect(pickBucketSizeMs(1000000000, 10, 1000, 60000)).toBe(60000);
    });

    it("should use standard scale factors (1, 2, 5)", () => {
      const result1 = pickBucketSizeMs(150_000, 150);
      expect([1000, 2000, 5000].includes(result1)).toBe(true);

      const result2 = pickBucketSizeMs(1_500_000, 150);
      expect([10_000, 20_000, 50_000].includes(result2)).toBe(true);
    });

    it("should handle custom target buckets", () => {
      const result1 = pickBucketSizeMs(100_000, 50);
      const result2 = pickBucketSizeMs(100_000, 20);
      expect(result1).toBeLessThan(result2);
    });
  });

  describe("lowerBoundByTime", () => {
    const createRecord = (timeUs: bigint, size = 100): ReadableRecord =>
      ({
        time: timeUs,
        size: BigInt(size),
        last: false,
        contentType: "application/json",
      }) as ReadableRecord;

    it("should find correct lower bound in sorted array", () => {
      const records = [
        createRecord(1000n),
        createRecord(2000n),
        createRecord(3000n),
        createRecord(4000n),
        createRecord(5000n),
      ];

      expect(lowerBoundByTime(records, 0n)).toBe(0);
      expect(lowerBoundByTime(records, 1000n)).toBe(0);
      expect(lowerBoundByTime(records, 1500n)).toBe(1);
      expect(lowerBoundByTime(records, 3000n)).toBe(2);
      expect(lowerBoundByTime(records, 6000n)).toBe(5);
    });

    it("should handle empty array", () => {
      expect(lowerBoundByTime([], 1000n)).toBe(0);
    });

    it("should handle single element", () => {
      const records = [createRecord(2000n)];
      expect(lowerBoundByTime(records, 1000n)).toBe(0);
      expect(lowerBoundByTime(records, 2000n)).toBe(0);
      expect(lowerBoundByTime(records, 3000n)).toBe(1);
    });
  });

  describe("upperBoundByTime", () => {
    const createRecord = (timeUs: bigint, size = 100): ReadableRecord =>
      ({
        time: timeUs,
        size: BigInt(size),
        last: false,
        contentType: "application/json",
      }) as ReadableRecord;

    it("should find correct upper bound in sorted array", () => {
      const records = [
        createRecord(1000n),
        createRecord(2000n),
        createRecord(3000n),
        createRecord(4000n),
        createRecord(5000n),
      ];

      expect(upperBoundByTime(records, 0n)).toBe(0);
      expect(upperBoundByTime(records, 1000n)).toBe(1);
      expect(upperBoundByTime(records, 1500n)).toBe(1);
      expect(upperBoundByTime(records, 3000n)).toBe(3);
      expect(upperBoundByTime(records, 6000n)).toBe(5);
    });

    it("should handle empty array", () => {
      expect(upperBoundByTime([], 1000n)).toBe(0);
    });

    it("should handle single element", () => {
      const records = [createRecord(2000n)];
      expect(upperBoundByTime(records, 1000n)).toBe(0);
      expect(upperBoundByTime(records, 2000n)).toBe(1);
      expect(upperBoundByTime(records, 3000n)).toBe(1);
    });
  });

  describe("binRecords", () => {
    const createRecord = (timeUs: bigint, size = 100): ReadableRecord =>
      ({
        time: timeUs,
        size: BigInt(size),
        last: false,
        contentType: "application/json",
      }) as ReadableRecord;

    it("should handle empty records array", () => {
      const result = binRecords([]);
      expect(result.points).toEqual([]);
      expect(result.bucketSizeMs).toBe(1000);
    });

    it("should bin records correctly with automatic range", () => {
      const records = [
        createRecord(1000_000n, 100), // 1 second, 100 bytes
        createRecord(2000_000n, 200), // 2 seconds, 200 bytes
        createRecord(3000_000n, 300), // 3 seconds, 300 bytes
      ];

      const result = binRecords(records);

      expect(result.bucketSizeMs).toBeGreaterThan(0);
      expect(result.points.length).toBeGreaterThan(0);

      const totalSize = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalSize).toBe(3);
    });

    it("should respect custom time range", () => {
      const records = [
        createRecord(1000_000n, 100), // 1 second
        createRecord(2000_000n, 200), // 2 seconds
        createRecord(3000_000n, 300), // 3 seconds
        createRecord(4000_000n, 400), // 4 seconds
        createRecord(5000_000n, 500), // 5 seconds
      ];

      // Only include records from 1.5 to 3.5 seconds
      const result = binRecords(records, 1500, 3500);

      // Should only include records at 2s and 3s
      const totalSize = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalSize).toBe(2);
    });

    it("should create proper time buckets", () => {
      const records = [
        createRecord(1000_000n, 100), // 1.0 second
        createRecord(1100_000n, 200), // 1.1 seconds
        createRecord(2000_000n, 300), // 2.0 seconds
      ];

      const result = binRecords(records);

      // Points should be sorted by time
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].x).toBeGreaterThanOrEqual(
          result.points[i - 1].x,
        );
      }
    });

    it("should handle records with same timestamp", () => {
      const records = [
        createRecord(1000_000n, 100),
        createRecord(1000_000n, 200),
        createRecord(1000_000n, 300),
      ];

      const result = binRecords(records);

      const totalSize = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalSize).toBe(3);

      const nonZeroPoints = result.points.filter((p) => p.y > 0);
      expect(nonZeroPoints.length).toBeGreaterThan(0);
    });
  });
});
