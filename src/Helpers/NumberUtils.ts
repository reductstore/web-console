/**
 * Convert a number to a bigint
 * @param num The number to convert
 */

export const bigintToNumber = (big: bigint) => {
  return Number(big.valueOf());
};

/**
 * Convert a number in milliseconds to a bigint in microseconds
 * @param ms The number in milliseconds to convert
 * @returns The number in microseconds as a bigint or undefined if input is undefined
 */
export const msToMicroseconds = (ms: number | bigint | undefined) => {
  if (ms === undefined) return undefined;
  return BigInt(ms) * 1000n;
};
