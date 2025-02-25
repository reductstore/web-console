import React from "react";
import { Descriptions } from "antd";
import { LicenseInfo } from "reduct-js";
import "./LicenseDetails.css";
import LicenseAlert from "../LicenseAlert/LicenseAlert";
// @ts-ignore
import prettierBytes from "prettier-bytes";
import { bigintToNumber } from "../../Helpers/NumberUtils";
import { checkLicenseStatus } from "../../Helpers/licenseUtils";

interface LicenseDetailsProps {
  license: LicenseInfo;
  usage: bigint;
}

const LicenseDetails: React.FC<LicenseDetailsProps> = ({ license, usage }) => {
  const { isValid, hasExpired, isOverQuota, usageInTB } = checkLicenseStatus(
    license,
    usage,
  );
  const isUnlimited = license.diskQuota === 0;
  const usagePercentage = isUnlimited
    ? "N/A"
    : `${((usageInTB / Number(license.diskQuota)) * 100).toFixed(2)}%`;
  const expiryDate = new Date(license.expiryDate).toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
  const alertMessage = (
    <span>
      Your license {hasExpired ? "has expired" : "disk quota has been exceeded"}
      . Please{" "}
      <strong>
        <a
          href="https://www.reduct.store/contact"
          target="_blank"
          rel="noopener noreferrer"
        >
          contact us
        </a>
      </strong>{" "}
      to {hasExpired ? "renew your license" : "increase your disk quota"} at
      your earliest convenience.
    </span>
  );
  return (
    <>
      {!isValid && (
        <div className="licenseAlert">
          <LicenseAlert alertMessage={alertMessage} />
        </div>
      )}
      <Descriptions size="default" column={1} className="licenseDescriptions">
        <Descriptions.Item label="Licensee">
          {license.licensee}
        </Descriptions.Item>
        <Descriptions.Item label="Plan">{license.plan}</Descriptions.Item>
        <Descriptions.Item label="Invoice">{license.invoice}</Descriptions.Item>
        <Descriptions.Item label="Device Number">
          {license.deviceNumber}
        </Descriptions.Item>
        <Descriptions.Item
          label="Expiry Date"
          className={hasExpired ? "expired" : ""}
        >
          {expiryDate}
        </Descriptions.Item>
        <Descriptions.Item
          label="Disk Quota"
          className={isOverQuota ? "overQuota" : ""}
        >
          {isUnlimited
            ? "Unlimited"
            : `${license.diskQuota} TB (Used: ${prettierBytes(bigintToNumber(usage))}, ${usagePercentage} of quota)`}
        </Descriptions.Item>
        <Descriptions.Item label="Fingerprint">
          {license.fingerprint}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
};

export default LicenseDetails;
