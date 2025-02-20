import React, { useEffect, useState } from "react";
import { IBackendAPI } from "../../BackendAPI";
import { ServerInfo, BucketInfo, TokenPermissions } from "reduct-js";
import { Card, Col, Divider, Modal, Row, Typography } from "antd";
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

  if (info === undefined) {
    return <Card bordered title="Server (no connection)" />;
  }

  const renderBucket = (numberInRow = 2) => {
    const fillRow = (row: number) => {
      const cards = [];
      for (let j = 0; j < numberInRow; ++j) {
        const index = row * numberInRow + j;
        if (index >= buckets.length) {
          break;
        }

        const bucket = buckets[index];
        cards.push(
          <Col span={24 / numberInRow} key={index}>
            <BucketCard
              bucketInfo={bucket}
              index={index}
              key={index}
              client={client}
              onRemoved={removeBucket}
              onShow={(name) => showBucket(name, history)}
            />
          </Col>,
        );
      }
      return cards;
    };

    const rows = [];
    for (let i = 0; i < buckets.length / numberInRow; ++i) {
      rows.push(<Row key={i}> {fillRow(i)}</Row>);
    }
    return rows;
  };

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
      <Card
        id="ServerInfo"
        title={
          <>
            Server{" "}
            <a
              href="https://github.com/reductstore/reductstore/releases"
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
        bordered
      >
        {activeTabKey === "usage" && (
          <UsageStatistics info={info} buckets={buckets} />
        )}
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
      {renderBucket()}
    </div>
  );
}
