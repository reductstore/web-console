import { ReadableRecord } from "reduct-js/lib/cjs/Record";

export type Point = { x: number; y: number };

/**
 * Find the first index where record.time >= targetUs using binary search
 * @param records - Array of records sorted by time
 * @param targetUs - Target time in microseconds
 * @returns Index of first record with time >= targetUs
 */
export function lowerBoundByTime(
  records: ReadableRecord[],
  targetUs: bigint,
): number {
  let lo = 0,
    hi = records.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (records[mid].time < targetUs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Find the first index where record.time > targetUs using binary search
 * @param records - Array of records sorted by time
 * @param targetUs - Target time in microseconds
 * @returns Index of first record with time > targetUs
 */
export function upperBoundByTime(
  records: ReadableRecord[],
  targetUs: bigint,
): number {
  let lo = 0,
    hi = records.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (records[mid].time <= targetUs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Calculate optimal bucket size in milliseconds for time-based histograms
 * @param rangeMs - Total time range in milliseconds
 * @param targetBuckets - Target number of buckets (default: 20)
 * @param minBucketMs - Minimum bucket size in milliseconds (default: 1000)
 * @param maxBucketMs - Maximum bucket size in milliseconds (default: Number.MAX_SAFE_INTEGER)
 * @returns Optimal bucket size in milliseconds
 */
export function pickBucketSizeMs(
  rangeMs: number,
  targetBuckets = 10,
  minBucketMs = 1000,
  maxBucketMs = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isFinite(rangeMs) || rangeMs <= 0) return minBucketMs;

  const desired = Math.max(
    Math.ceil(rangeMs / Math.max(1, targetBuckets)),
    minBucketMs,
  );

  let scale = 1_000;
  while (scale <= maxBucketMs) {
    for (const f of [1, 2, 5]) {
      const step = f * scale;
      if (step >= desired) return Math.min(step, maxBucketMs);
    }
    scale *= 10;
  }

  return maxBucketMs;
}

/**
 * Picks an appropriate $each_t interval for time-based aggregation queries.
 * Calculates the time interval needed to get approximately targetRecords from the given time range.
 * Uses nice round numbers like 1s, 5s, 10s, 30s, 1m, 5m, 10m, 30m, 1h, 2h, 6h, 12h, 1d, etc.
 * Returns null for very small intervals where aggregation is not beneficial.
 *
 * @param rangeMs - Time range in milliseconds
 * @param targetRecords - Target number of records to return (default: 200)
 * @param minIntervalMs - Minimum interval in milliseconds (default: 500ms)
 * @param maxIntervalMs - Maximum interval in milliseconds (default: 7 days)
 * @returns Human-readable time interval string (e.g., "10s", "5m", "1h", "1d") or null for small intervals
 */
export function pickEachTInterval(
  rangeMs: number,
  targetRecords = 100,
  minIntervalMs = 500,
  maxIntervalMs = 7 * 24 * 60 * 60 * 1000, // 7 days
): string | null {
  if (!isFinite(rangeMs) || rangeMs <= 0) {
    return "0s";
  }

  let intervalMs = rangeMs / targetRecords;

  if (intervalMs < minIntervalMs) {
    return "0s";
  }

  intervalMs = Math.min(maxIntervalMs, intervalMs);

  const niceIntervals = [
    { ms: 500, str: "500ms" },
    { ms: 1000, str: "1s" },
    { ms: 2000, str: "2s" },
    { ms: 5000, str: "5s" },
    { ms: 10000, str: "10s" },
    { ms: 15000, str: "15s" },
    { ms: 30000, str: "30s" },
    { ms: 60000, str: "1m" },
    { ms: 120000, str: "2m" },
    { ms: 300000, str: "5m" },
    { ms: 600000, str: "10m" },
    { ms: 900000, str: "15m" },
    { ms: 1800000, str: "30m" },
    { ms: 3600000, str: "1h" },
    { ms: 7200000, str: "2h" },
    { ms: 10800000, str: "3h" },
    { ms: 21600000, str: "6h" },
    { ms: 43200000, str: "12h" },
    { ms: 86400000, str: "1d" },
    { ms: 172800000, str: "2d" },
    { ms: 259200000, str: "3d" },
    { ms: 604800000, str: "7d" },
  ];

  let [bestInterval] = niceIntervals;
  let bestDiff = Math.abs(intervalMs - bestInterval.ms);

  for (const interval of niceIntervals) {
    const diff = Math.abs(intervalMs - interval.ms);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestInterval = interval;
    }
  }

  return bestInterval.str;
}

/**
 * Bin records into time buckets for visualization
 * @param records - Array of records sorted by time
 * @param startMs - Optional start time in milliseconds
 * @param endMs - Optional end time in milliseconds
 * @returns Points array with number of records bucketed by time
 */
export function binRecords(
  records: ReadableRecord[],
  startMs?: number,
  endMs?: number,
): { points: Point[]; bucketSizeMs: number } {
  if (!records.length) return { points: [], bucketSizeMs: 1_000 };

  const first = Number(records[0].time / 1000n);
  const last = Number(records[records.length - 1].time / 1000n);

  const minMs = startMs ?? first;
  const maxMs = endMs ?? last;

  const size = pickBucketSizeMs(Math.max(1, maxMs - minMs));

  const minUs = BigInt(Math.trunc(minMs * 1000));
  const maxUs = BigInt(Math.trunc(maxMs * 1000));
  const startIdx = lowerBoundByTime(records, minUs);
  const endIdx = upperBoundByTime(records, maxUs);

  const firstBucketStart = Math.floor(minMs / size) * size;
  const bucketCount = Math.floor((maxMs - firstBucketStart) / size) + 1;

  if (bucketCount <= 0) return { points: [], bucketSizeMs: size };

  const totals = new Float64Array(bucketCount);

  for (let i = startIdx; i < endIdx; i++) {
    const tMs = Number(records[i].time / 1000n);
    const idx = Math.floor((tMs - firstBucketStart) / size);
    if (idx >= 0 && idx < bucketCount) totals[idx] += 1;
  }

  const points: Point[] = new Array(bucketCount);
  for (let i = 0; i < bucketCount; i++)
    points[i] = { x: firstBucketStart + i * size, y: totals[i] };

  return { points, bucketSizeMs: size };
}
