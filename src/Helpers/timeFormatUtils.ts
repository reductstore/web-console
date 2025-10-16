import dayjs from "dayjs";

/**
 * Format a bigint timestamp value to either Unix timestamp string or ISO string
 * @param val - The timestamp value in microseconds as bigint, or undefined
 * @param unix - Whether to format as Unix timestamp (true) or ISO string (false)
 * @returns Formatted string or empty string if val is undefined
 */
export const formatValue = (val: bigint | undefined, unix: boolean): string => {
  if (val === undefined) return "";
  return unix ? val.toString() : new Date(Number(val / 1000n)).toISOString();
};

/**
 * Format a bigint timestamp for display in charts and UI components
 * @param val - The timestamp value in microseconds as bigint
 * @param format - The dayjs format string to use
 * @returns Formatted string using dayjs UTC
 */
export const formatTimestamp = (val: bigint, format: string): string => {
  return dayjs(Number(val / 1000n))
    .utc()
    .format(format);
};
