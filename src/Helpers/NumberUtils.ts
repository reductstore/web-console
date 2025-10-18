/**
 * Convert a number to a bigint
 * @param num The number to convert
 */

export const bigintToNumber = (big: bigint) => {
  return Number(big.valueOf());
};

/**
 * Convert milliseconds to microseconds as bigint.
 * @param ms The time in milliseconds (number or bigint).
 * @returns Microseconds as bigint, or undefined if invalid.
 */
export const msToMicroseconds = (ms?: number | bigint): bigint | undefined => {
  if (ms === undefined || ms === null) return undefined;

  if (typeof ms === "bigint") return ms * 1000n;

  const n = Number(ms);
  if (Number.isNaN(n)) return undefined;

  return BigInt(Math.trunc(n * 1000));
};
