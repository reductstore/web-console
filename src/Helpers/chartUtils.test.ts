import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import {
  pickBucketSize,
  pickEachTInterval,
  lowerBoundByTime,
  upperBoundByTime,
  binRecords,
} from "./chartUtils";

describe("chartUtils", () => {
  describe("pickEachTInterval", () => {
    it("should return 10ms for small ranges", () => {
      expect(pickEachTInterval(0n, 1000n * 1000n)).toBe("10ms");
      expect(pickEachTInterval(0n, 5000n * 1000n)).toBe("50ms");
    });

    it("should return appropriate intervals for day ranges", () => {
      const oneDayUs = BigInt(86_400_000 * 1000);
      const twoDaysUs = BigInt(172_800_000 * 1000);
      expect(pickEachTInterval(0n, oneDayUs)).toBe("16m");
      expect(pickEachTInterval(0n, twoDaysUs)).toBe("33m");
    });

    it("should return hours for large ranges", () => {
      const weekUs = BigInt(604_800_000 * 1000);
      const monthUs = BigInt(2_592_000_000 * 1000);
      expect(pickEachTInterval(0n, weekUs)).toBe("2h");
      expect(pickEachTInterval(0n, monthUs)).toBe("8h");
    });

    it("should handle custom target records", () => {
      const rangeUs = BigInt(100_000 * 1000);
      const result1 = pickEachTInterval(0n, rangeUs, 20);
      expect(result1).toBe("5s");

      const result2 = pickEachTInterval(0n, rangeUs, 5);
      expect(result2).toBe("20s");
    });

    it("should handle invalid inputs", () => {
      expect(pickEachTInterval()).toBe("0s");
      expect(pickEachTInterval(0n)).toBe("0s");
      expect(pickEachTInterval(undefined, 1000n)).toBe("0s");
      expect(pickEachTInterval(1000n, 500n)).toBe("0s");
    });

    it("should handle 7-day default case", () => {
      const sevenDaysUs = BigInt(7 * 24 * 60 * 60 * 1000 * 1000);
      const result = pickEachTInterval(0n, sevenDaysUs);
      expect(result).toBe("2h");
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
      expect(result.bucketSize).toBe(1_000_000n);
    });

    it("should bin records correctly with automatic range", () => {
      const records = [
        createRecord(1000_000n, 100),
        createRecord(2000_000n, 200),
        createRecord(3000_000n, 300),
      ];

      const result = binRecords(records);

      expect(result.bucketSize).toBeGreaterThan(0);
      expect(result.points.length).toBeGreaterThan(0);

      const totalSize = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalSize).toBe(3);
    });

    it("should respect custom time range", () => {
      const records = [
        createRecord(1000_000n, 100),
        createRecord(2000_000n, 200),
        createRecord(3000_000n, 300),
        createRecord(4000_000n, 400),
        createRecord(5000_000n, 500),
      ];

      const result = binRecords(records, 1500_000n, 3500_000n);
      const totalSize = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalSize).toBe(2);
    });

    it("should create proper time buckets", () => {
      const records = [
        createRecord(1000_000n, 100),
        createRecord(1100_000n, 200),
        createRecord(2000_000n, 300),
      ];

      const result = binRecords(records);
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

  describe("pickBucketSize", () => {
    it("should return 0 for invalid ranges", () => {
      expect(pickBucketSize(0n)).toBe(0n);
      expect(pickBucketSize(-100n)).toBe(0n);
    });

    it("should respect maximum bucket size", () => {
      expect(pickBucketSize(10_000_000n, 10, 5_000n)).toBe(5_000n);
    });

    it("should use standard scale factors (1, 2, 5)", () => {
      expect(pickBucketSize(10_000n, 10)).toBe(1_000n);
      expect(pickBucketSize(20_000n, 10)).toBe(2_000n);
      expect(pickBucketSize(50_000n, 10)).toBe(5_000n);
    });

    it("should handle custom target buckets", () => {
      const range = 1_000_000n;
      expect(pickBucketSize(range, 20)).toBe(50_000n);
      expect(pickBucketSize(range, 5)).toBe(200_000n);
    });
  });

  describe("binRecords", () => {
    const createMockRecord = (timeUs: bigint): ReadableRecord =>
      ({
        time: timeUs,
        size: 100n,
        contentType: "application/json",
        labels: {},
      }) as ReadableRecord;

    it("should handle empty records array", () => {
      const result = binRecords([]);
      expect(result.points).toEqual([]);
      expect(result.bucketSize).toBe(1_000_000n);
    });

    it("should bin records correctly with automatic range", () => {
      const records = [
        createMockRecord(1_000_000n),
        createMockRecord(1_500_000n),
        createMockRecord(2_000_000n),
      ];

      const result = binRecords(records);

      expect(result.points.length).toBeGreaterThan(0);
      expect(result.bucketSize).toBeGreaterThan(0n);

      const totalRecords = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalRecords).toBe(3);
    });

    it("should respect custom time range", () => {
      const records = [
        createMockRecord(1_000_000n),
        createMockRecord(2_000_000n),
        createMockRecord(3_000_000n),
      ];

      const result = binRecords(records, 1_500_000n, 2_500_000n);

      const totalRecords = result.points.reduce((sum, p) => sum + p.y, 0);
      expect(totalRecords).toBe(1);
    });

    it("should convert microseconds to milliseconds for chart points", () => {
      const records = [createMockRecord(1_000_000n)];

      const result = binRecords(records);

      expect(result.points[0].x).toBe(1000);
    });
  });
});
