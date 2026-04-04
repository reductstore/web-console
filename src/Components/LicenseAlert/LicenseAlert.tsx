import React from "react";
import { Alert } from "antd";

interface LicenseAlertProps {
  alertMessage?: React.ReactNode;
}

const LicenseAlert: React.FC<LicenseAlertProps> = ({ alertMessage }) => (
  <Alert
    type="warning"
    title={
      alertMessage || (
        <span>
          ReductStore Core is licensed under the{" "}
          <strong>
            <a
              href="https://github.com/reductstore/reductstore/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apache License 2.0
            </a>
          </strong>{" "}
          and commercial licensing options for{" "}
          <strong>
            <a
              href="https://www.reduct.store/pricing"
              target="_blank"
              rel="noopener noreferrer"
            >
              ReductStore Pro
            </a>
          </strong>{" "}
          are available on our pricing page.
        </span>
      )
    }
  />
);

export default LicenseAlert;
