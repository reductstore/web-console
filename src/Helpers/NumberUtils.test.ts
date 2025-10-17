import { bigintToNumber, msToMicroseconds } from "./NumberUtils";

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

describe("msToMicroseconds", () => {
  it("should convert milliseconds to microseconds correctly", () => {
    const result = msToMicroseconds(1);
    expect(result).toBe(1000n);
  });

  it("should handle zero milliseconds", () => {
    const result = msToMicroseconds(0);
    expect(result).toBe(0n);
  });

  it("should handle large millisecond values", () => {
    const result = msToMicroseconds(123456789);
    expect(result).toBe(123456789000n);
  });

  it("should handle negative millisecond values", () => {
    const result = msToMicroseconds(-5);
    expect(result).toBe(-5000n);
  });
});
