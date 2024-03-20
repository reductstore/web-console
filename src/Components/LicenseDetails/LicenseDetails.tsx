import React from "react";
import {Descriptions} from "antd";

interface LicenseDetailsProps {
  license: {
    licensee: string;
    invoice: string;
    expiry_date: string;
    plan: string;
    device_number: number;
    disk_quota: number;
    fingerprint: string;
  };
}

const LicenseDetails: React.FC<LicenseDetailsProps> = ({license}) => (
  <Descriptions size="small" column={3}>
    <Descriptions.Item label="Plan">{license.plan}</Descriptions.Item>
    <Descriptions.Item label="Licensee">{license.licensee}</Descriptions.Item>
    <Descriptions.Item label="Invoice">{license.invoice}</Descriptions.Item>
    <Descriptions.Item label="Expiry Date">{license.expiry_date}</Descriptions.Item>
    <Descriptions.Item label="Device Number">{license.device_number}</Descriptions.Item>
    <Descriptions.Item label="Disk Quota">{license.disk_quota}</Descriptions.Item>
    <Descriptions.Item label="Fingerprint">{license.fingerprint}</Descriptions.Item>
  </Descriptions>
);

export default LicenseDetails;
