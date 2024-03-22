import React from "react";
import {Descriptions} from "antd";
import {LicenseInfo} from "reduct-js";
import "./LicenseDetails.css";
import LicenseAlert from "../LicenseAlert/LicenseAlert";
// @ts-ignore
import prettierBytes from "prettier-bytes";

interface LicenseDetailsProps {
  license: LicenseInfo;
  usage: bigint;
}

const LicenseDetails: React.FC<LicenseDetailsProps> = ({license, usage}) => {
  const expiryDate = new Date(license.expiryDate).toLocaleDateString(undefined,
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const hasExpired = Date.now() > license.expiryDate;
  const isOverQuota = usage > BigInt(license.diskQuota);
  const alertExplanation = hasExpired ? "Your license has expired. " : isOverQuota ? "You have exceeded your disk quota. " : "";

  return (
    <>
      {alertExplanation && <div className="licenseAlert"><LicenseAlert alertExplanation={alertExplanation} /></div>}
      <Descriptions size="small" column={3} className="licenseDescriptions">
        <Descriptions.Item label="Plan">{license.plan}</Descriptions.Item>
        <Descriptions.Item label="Licensee">{license.licensee}</Descriptions.Item>
        <Descriptions.Item label="Invoice">{license.invoice}</Descriptions.Item>
        <Descriptions.Item label="Expiry Date">{expiryDate}</Descriptions.Item>
        <Descriptions.Item label="Device Number">{license.deviceNumber}</Descriptions.Item>
        <Descriptions.Item label="Disk Quota">{prettierBytes(license.diskQuota)}</Descriptions.Item>
        <Descriptions.Item label="Fingerprint">{license.fingerprint}</Descriptions.Item>
      </Descriptions>
    </>
  );
};

export default LicenseDetails;
