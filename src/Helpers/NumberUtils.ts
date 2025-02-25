/**
 * Convert a number to a bigint
 * @param num The number to convert
 */

export const bigintToNumber = (big: bigint) => {
  return Number(big.valueOf());
};
