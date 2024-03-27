import React from "react";
import {Alert} from "antd";

interface LicenseAlertProps {
  alertMessage?: React.ReactNode;
}

const LicenseAlert: React.FC<LicenseAlertProps> = ({alertMessage}) => (
  <Alert
    type="warning"
    message={
      alertMessage || (
        <span>
          Please review the <strong>
            <a href="https://github.com/reductstore/reductstore/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
              Business Source License (BUSL)
            </a></strong> for ReductStore and consult our <strong>
            <a href="https://www.reduct.store/pricing" target="_blank" rel="noopener noreferrer">
              pricing page
            </a></strong> for more information on licensing options.
        </span>
      )}
  />
);

export default LicenseAlert;
