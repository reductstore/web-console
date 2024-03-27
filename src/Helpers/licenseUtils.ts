import {LicenseInfo} from "reduct-js";

interface LicenseStatus {
  isValid: boolean;
  hasExpired: boolean;
  isOverQuota: boolean;
  usageInTB: number;
}

/**
 * Checks the license status based on usage and quota.
 * @param {LicenseInfo} license - The license information.
 * @param {bigint} usage - Current usage in bytes.
 * @return {LicenseStatus} License status information.
 */
export function checkLicenseStatus(
  license: LicenseInfo | undefined,
  usage: bigint
): LicenseStatus {
  if (!license) {
    return {
      isValid: false,
      hasExpired: false,
      isOverQuota: false,
      usageInTB: 0,
    };
  }

  const usageInTB = Number(usage) / 1_000_000_000_000;
  const isUnlimited = license.diskQuota === 0;
  const hasExpired = Date.now() > license.expiryDate;
  const isOverQuota = !isUnlimited && usageInTB > Number(license.diskQuota);

  return {
    isValid: !hasExpired && !isOverQuota,
    hasExpired,
    isOverQuota,
    usageInTB,
  };
}
