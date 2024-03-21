import React from "react";
import {Descriptions} from "antd";
import {LicenseInfo} from "reduct-js";

interface LicenseDetailsProps {
  license: LicenseInfo;
}

const LicenseDetails: React.FC<LicenseDetailsProps> = ({license}) => (
  <Descriptions size="small" column={3}>
    <Descriptions.Item label="Plan">{license.plan}</Descriptions.Item>
    <Descriptions.Item label="Licensee">{license.licensee}</Descriptions.Item>
    <Descriptions.Item label="Invoice">{license.invoice}</Descriptions.Item>
    <Descriptions.Item label="Expiry Date">{license.expiryDate}</Descriptions.Item>
    <Descriptions.Item label="Device Number">{license.deviceNumber}</Descriptions.Item>
    <Descriptions.Item label="Disk Quota">{license.diskQuota}</Descriptions.Item>
    <Descriptions.Item label="Fingerprint">{license.fingerprint}</Descriptions.Item>
  </Descriptions>
);

export default LicenseDetails;
