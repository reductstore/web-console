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
 * Calculate optimal bucket size in microseconds for time-based histograms
 * @param rangeUs - Total time range in microseconds
 * @param targetBuckets - Target number of buckets (default: 20)
 * @param maxBucketUs - Maximum bucket size in microseconds (default: Number.MAX_SAFE_INTEGER)
 * @returns Optimal bucket size in microseconds
 */
export function pickBucketSize(
  rangeUs: bigint,
  targetBuckets = 12,
  maxBucketUs = BigInt(Number.MAX_SAFE_INTEGER),
): bigint {
  if (rangeUs <= 0n) return 0n;

  const desired = rangeUs / BigInt(Math.max(1, targetBuckets));

  let scale = 1n;
  while (scale <= maxBucketUs) {
    for (const f of [1n, 2n, 3n, 5n]) {
      const step = f * scale;
      if (step >= desired) return step < maxBucketUs ? step : maxBucketUs;
    }
    scale *= 10n;
  }

  return maxBucketUs;
}

/**
 * Pick a suitable time interval string (e.g., '5s', '1m') for $__interval
 * @param start - Start time in microseconds
 * @param end - End time in microseconds
 * @param targetRecords - Target number of records (default: 150)
 * @returns Time interval string or 0s if invalid range
 */
export function pickEachTInterval(
  start?: bigint,
  end?: bigint,
  targetRecords = 120,
): string {
  if (start == null || end == null) return "0s";

  const range = end - start;
  if (range <= 0n) return "0s";

  const target = BigInt(Math.max(1, targetRecords));
  const week = 7n * 24n * 60n * 60n * 1_000_000n;

  let desired = range / target;
  if (desired <= 0n) return "0s";
  if (desired > week) desired = week;

  const candidates: bigint[] = [];
  for (let scale = 1n; scale <= week; scale *= 10n) {
    for (const f of [1n, 2n, 3n, 5n]) {
      const v = f * scale;
      if (v <= week) candidates.push(v);
    }
  }

  let best = candidates[candidates.length - 1];
  for (const v of candidates) {
    if (v >= desired) {
      best = v;
      break;
    }
  }

  const us = 1n;
  const ms = 1_000n * us;
  const s = 1_000n * ms;
  const m = 60n * s;
  const h = 60n * m;
  const d = 24n * h;

  const fmt = (val: bigint): string => {
    if (val >= d) return `${Number(val / d)}d`;
    if (val >= h) return `${Number(val / h)}h`;
    if (val >= m) return `${Number(val / m)}m`;
    if (val >= s) return `${Number(val / s)}s`;
    if (val >= ms) return `${Number(val / ms)}ms`;
    return `${val}us`;
  };

  return fmt(best);
}

/**
 * Bin records into time buckets (centered x-values) and count number of records per bucket
 * @param records - Array of records sorted by time
 * @param start - Optional start time in microseconds
 * @param end - Optional end time in microseconds
 * @param convert - Function to convert microseconds to desired x-axis value (default: milliseconds)
 * @returns Points array with number of records bucketed by time
 */
export function binRecords(
  records: ReadableRecord[],
  start?: bigint,
  end?: bigint,
  convert: (us: bigint) => number = (us) => Number(us / 1000n),
  centerX = true,
): { points: Point[]; bucketSize: bigint } {
  if (!records.length) return { points: [], bucketSize: 1_000_000n };

  const first = records[0].time;
  const last = records[records.length - 1].time;

  const minUs = start ?? first;
  const maxUs = end ?? last;

  const rangeUs = maxUs - minUs;
  const bucketSize = pickBucketSize(rangeUs > 0n ? rangeUs : 1n);

  const startIdx = lowerBoundByTime(records, minUs);
  const endIdx = upperBoundByTime(records, maxUs);

  const firstBucketStart = (minUs / bucketSize) * bucketSize;
  const bucketCount = Number((maxUs - firstBucketStart) / bucketSize) + 1;

  if (bucketCount <= 0) return { points: [], bucketSize };

  const totals = new Float64Array(bucketCount);

  for (let i = startIdx; i < endIdx; i++) {
    const tUs = records[i].time;
    const idx = Number((tUs - firstBucketStart) / bucketSize);
    if (idx >= 0 && idx < bucketCount) totals[idx] += 1;
  }

  const points: Point[] = new Array(bucketCount);
  const half = bucketSize / 2n;
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = firstBucketStart + BigInt(i) * bucketSize;
    const xUs = bucketStart + half;
    points[i] = { x: convert(xUs), y: totals[i] };
  }

  return { points, bucketSize };
}
