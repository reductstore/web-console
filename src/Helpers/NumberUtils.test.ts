import {bigintToNumber} from "./NumberUtils";

describe("bigintToNumber", () => {
  it("should convert a small bigint to a number accurately", () => {
    const result = bigintToNumber(123n);
    expect(result).toBe(123);
    expect(typeof result).toBe("number");
  });

  it("should convert a large bigint to a number accurately", () => {
    const bigIntValue = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
    const result = bigintToNumber(bigIntValue);
    expect(result).toBe(Number(bigIntValue));
    expect(result).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });

  it("should handle negative bigint values", () => {
    const result = bigintToNumber(-123n);
    expect(result).toBe(-123);
    expect(typeof result).toBe("number");
  });

  it("should handle zero", () => {
    const result = bigintToNumber(0n);
    expect(result).toBe(0);
    expect(typeof result).toBe("number");
  });
});
