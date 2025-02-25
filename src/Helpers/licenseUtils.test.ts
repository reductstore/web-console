import { LicenseInfo } from "reduct-js";
import { checkLicenseStatus } from "./licenseUtils";

describe("checkLicenseStatus", () => {
  it("should return invalid status when license is undefined", () => {
    const result = checkLicenseStatus(undefined, 100n);
    expect(result).toEqual({
      isValid: false,
      hasExpired: false,
      isOverQuota: false,
      usageInTB: 0,
    });
  });

  it("should return valid status for a valid license within quota", () => {
    const license: LicenseInfo = {
      diskQuota: 2,
      expiryDate: Date.now() + 100000,
      plan: "",
      licensee: "",
      invoice: "",
      deviceNumber: 0,
      fingerprint: "",
    };
    const usage = 1n * 1_000_000_000_000n;
    const result = checkLicenseStatus(license, usage);
    expect(result).toEqual({
      isValid: true,
      hasExpired: false,
      isOverQuota: false,
      usageInTB: 1,
    });
  });

  it("should detect an expired license", () => {
    const license: LicenseInfo = {
      diskQuota: 2,
      expiryDate: Date.now() - 100000,
      plan: "",
      licensee: "",
      invoice: "",
      deviceNumber: 0,
      fingerprint: "",
    };
    const usage = 1n * 1_000_000_000_000n;
    const result = checkLicenseStatus(license, usage);
    expect(result.isValid).toBe(false);
    expect(result.hasExpired).toBe(true);
  });

  it("should detect when usage exceeds quota", () => {
    const license: LicenseInfo = {
      diskQuota: 1,
      expiryDate: Date.now() + 100000,
      plan: "",
      licensee: "",
      invoice: "",
      deviceNumber: 0,
      fingerprint: "",
    };
    const usage = 2n * 1_000_000_000_000n;
    const result = checkLicenseStatus(license, usage);
    expect(result.isValid).toBe(false);
    expect(result.isOverQuota).toBe(true);
  });

  it("should handle unlimited quota", () => {
    const license: LicenseInfo = {
      diskQuota: 0,
      expiryDate: Date.now() + 100000,
      plan: "",
      licensee: "",
      invoice: "",
      deviceNumber: 0,
      fingerprint: "",
    };
    const usage = 10n * 1_000_000_000_000n;
    const result = checkLicenseStatus(license, usage);
    expect(result.isValid).toBe(true);
    expect(result.isOverQuota).toBe(false);
  });
});
