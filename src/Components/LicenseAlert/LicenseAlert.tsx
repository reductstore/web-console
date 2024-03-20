import React from "react";
import {Alert} from "antd";

const LicenseAlert: React.FC = () => (
  <Alert
    type="warning"
    message={
      <span>
        Please review the <strong>
          <a href="https://github.com/reductstore/reductstore/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
            Business Source License (BUSL)
          </a></strong> for ReductStore and consult our <strong>
          <a href="https://www.reduct.store/pricing" target="_blank" rel="noopener noreferrer">
            pricing page
          </a></strong> for more information on licensing options.
      </span>
    }
    showIcon
  />
);

export default LicenseAlert;
