import { ReadableRecord } from "reduct-js/lib/cjs/Record";

export type Point = { x: number; y: number };

/**
 * Round time range to bucket boundaries
 * @param minMs - Minimum time in milliseconds
 * @param maxMs - Maximum time in milliseconds
 * @param sizeMs - Bucket size in milliseconds
 * @returns Object with rounded min and max values
 */
export function roundToBuckets(minMs: number, maxMs: number, sizeMs: number) {
  const min = Math.floor(minMs / sizeMs) * sizeMs - sizeMs / 100;
  const max = Math.floor(maxMs / sizeMs) * sizeMs + sizeMs / 100;
  return { min, max };
}

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
 * @param targetBars - Target number of bars/buckets (default: 150)
 * @param minBucketMs - Minimum bucket size in milliseconds (default: 1000)
 * @param maxBucketMs - Maximum bucket size in milliseconds (default: Number.MAX_SAFE_INTEGER)
 * @returns Optimal bucket size in milliseconds
 */
export function pickBucketSizeMs(
  rangeMs: number,
  targetBars = 100,
  minBucketMs = 1000,
  maxBucketMs = Number.MAX_SAFE_INTEGER,
): number {
  if (!Number.isFinite(rangeMs) || rangeMs <= 0) return minBucketMs;

  const desired = Math.max(
    Math.ceil(rangeMs / Math.max(1, targetBars)),
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
 * Bin records into time buckets for histogram visualization
 * @param records - Array of records sorted by time
 * @param startMs - Optional start time in milliseconds
 * @param endMs - Optional end time in milliseconds
 * @returns Object containing points array and bucket size
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
  const totals = new Float64Array(bucketCount);

  for (let i = startIdx; i < endIdx; i++) {
    const tMs = Number(records[i].time / 1000n);
    const idx = Math.floor((tMs - firstBucketStart) / size);
    if (idx >= 0 && idx < bucketCount) totals[idx] += Number(records[i].size);
  }

  const points: Point[] = new Array(bucketCount);
  for (let i = 0; i < bucketCount; i++)
    points[i] = { x: firstBucketStart + i * size, y: totals[i] };

  return { points, bucketSizeMs: size };
}
