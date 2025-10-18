import React, { useEffect, useState } from "react";
import { IBackendAPI } from "../../BackendAPI";
import { ServerInfo, BucketInfo, TokenPermissions } from "reduct-js";
import { Card, Divider, Modal, Typography } from "antd";
import "./Dashboard.css";
import BucketCard from "../../Components/Bucket/BucketCard";
import BucketSettingsForm from "../../Components/Bucket/BucketSettingsForm";

import { PlusOutlined, ExclamationCircleFilled } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import { History } from "history";
import UsageStatistics from "../../Components/UsageStatistics/UsageStatistics";
import LicenseDetails from "../../Components/LicenseDetails/LicenseDetails";
import LicenseAlert from "../../Components/LicenseAlert/LicenseAlert";
import { checkLicenseStatus } from "../../Helpers/licenseUtils";

interface Props {
  backendApi: IBackendAPI;
  permissions?: TokenPermissions;
  autoRefresh?: boolean;
}

/**
 * Dashboard with information about the server and list of buckets
 */
export default function Dashboard(props: Readonly<Props>) {
  const history = useHistory();

  const [info, setInfo] = useState<ServerInfo | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [creatingBucket, setCreatingBucket] = useState(false);

  const [isLicenseValid, setIsLicenseValid] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState<string>("usage");

  const onTabChange = (key: string) => {
    setActiveTabKey(key);
  };

  const tabList = [
    {
      key: "usage",
      tab: "Usage",
    },
    {
      key: "license",
      tab: (
        <span>
          <span className={isLicenseValid ? "hide" : "warningIcon"}>
            <ExclamationCircleFilled />
          </span>
          <span>License</span>
        </span>
      ),
    },
  ];

  const getInfo = async () => {
    setError(undefined);
    try {
      const { client } = props.backendApi;
      setInfo(await client.getInfo());
      setBuckets(
        (await client.getBucketList()).sort((a, b) =>
          Number(b.latestRecord - a.latestRecord),
        ),
      );
    } catch (err) {
      console.error(err);
      setError("Server (no connection)");
    }
  };

  const checkLicense = () => {
    if (info?.license) {
      const { isValid } = checkLicenseStatus(info.license, info.usage);
      setIsLicenseValid(isValid);
    }
  };

  useEffect(() => {
    getInfo().then();
    const interval = setInterval(() => getInfo(), 5000);
    return () => clearInterval(interval);
  }, [creatingBucket]);

  useEffect(() => {
    checkLicense();
  }, [info]);

  const removeBucket = async (name: string) => {
    try {
      await getInfo();
    } catch (err) {
      console.error("Failed to remove %s : %s", name, err);
    }
  };

  const showBucket = async (name: string, history: History<unknown>) => {
    history.push(`/buckets/${name}`);
  };

  const renderBuckets = () => (
    <div className="BucketList">
      {buckets.map((bucket, index) => (
        <BucketCard
          key={bucket.name}
          bucketInfo={bucket}
          index={index}
          client={client}
          onRemoved={removeBucket}
          onShow={(name) => showBucket(name, history)}
        />
      ))}
    </div>
  );

  const allowedActions = [];
  if (props.permissions && props.permissions.fullAccess) {
    allowedActions.push(
      <PlusOutlined
        title="Create bucket"
        key="create"
        onClick={() => setCreatingBucket(true)}
      />,
    );
  }

  const { client } = props.backendApi;
  return (
    <div className="Panel">
      {error && <Card variant="outlined" title={error} />}
      {info && !error && (
        <>
          <Card
            id="ServerInfo"
            title={
              <>
                Server{" "}
                <a
                  href={`https://github.com/reductstore/reductstore/releases/tag/v${info.version}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  v{info.version}
                </a>
              </>
            }
            actions={allowedActions}
            tabList={tabList}
            activeTabKey={activeTabKey}
            onTabChange={onTabChange}
            variant="outlined"
          >
            {activeTabKey === "usage" && <UsageStatistics info={info} />}
            {activeTabKey === "license" && info.license && (
              <LicenseDetails license={info.license} usage={info.usage} />
            )}
            {activeTabKey === "license" && !info.license && <LicenseAlert />}

            <Modal
              title="Add a new bucket"
              open={creatingBucket}
              footer={null}
              onCancel={() => setCreatingBucket(false)}
            >
              <BucketSettingsForm
                client={client}
                onCreated={async () => {
                  setCreatingBucket(false);
                }}
              />
            </Modal>
          </Card>
          <Divider />
          <Typography.Title level={3}>Buckets</Typography.Title>

          {renderBuckets()}
        </>
      )}
    </div>
  );
}
