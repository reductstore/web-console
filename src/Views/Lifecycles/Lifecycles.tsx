import React, { useEffect, useState } from "react";
import {
  APIError,
  BucketInfo,
  Client,
  LifecycleInfo,
  LifecycleMode,
  TokenPermissions,
} from "reduct-js";
import {
  Badge,
  Button,
  message,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

import { Link } from "react-router-dom";
import LifecycleSettingsForm from "../../Components/Lifecycle/LifecycleSettingsForm";
import {
  MODE_SELECT_OPTIONS,
  MODE_SELECT_STYLE,
} from "../../Components/Lifecycle/LifecycleModeUtils";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

export default function Lifecycles(props: Readonly<Props>) {
  const [lifecycles, setLifecycles] = useState<LifecycleInfo[]>([]);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingLifecycles, setIsLoadingLifecycles] = useState(true);

  const [creatingLifecycle, setCreatingLifecycle] = useState(false);
  const [changingMode, setChangingMode] = useState<string | null>(null);

  const onModeChange = async (name: string, newMode: LifecycleMode) => {
    setChangingMode(name);
    try {
      await props.client.setLifecycleMode(name, newMode);
      await getLifecycles();

      if (newMode === LifecycleMode.ENABLED) {
        message.success(`Lifecycle "${name}" enabled.`);
      } else if (newMode === LifecycleMode.DRY_RUN) {
        message.success(`Lifecycle "${name}" set to dry run.`);
      } else if (newMode === LifecycleMode.DISABLED) {
        message.success(`Lifecycle "${name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        message.error(`Failed to change lifecycle mode: ${err.message}`);
      } else {
        message.error("Failed to change lifecycle mode.");
      }
    } finally {
      setChangingMode(null);
    }
  };

  const getLifecycles = async () => {
    try {
      setIsLoadingLifecycles(true);
      setLifecycles(await props.client.getLifecycleList());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingLifecycles(false);
    }
  };

  const getBuckets = async () => {
    try {
      setBuckets(await props.client.getBucketList());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getLifecycles().then();
    const interval = setInterval(() => getLifecycles(), 5000);
    return () => clearInterval(interval);
  }, [creatingLifecycle]);

  useEffect(() => {
    getBuckets().then();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const data = lifecycles.map((lifecycle, index) => ({
    key: `lifecycle-${index}`,
    name: lifecycle.name,
    mode: lifecycle.mode,
    isRunning: lifecycle.isRunning,
    isProvisioned: lifecycle.isProvisioned,
  }));

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Link to={`/lifecycles/${text}`}>
          <b>{text}</b>
        </Link>
      ),
    },
    {
      title: "Mode",
      dataIndex: "mode",
      key: "mode",
      render: (mode: LifecycleMode, record: { name: string }) => {
        const canChangeMode = props.permissions?.fullAccess;
        if (!canChangeMode) {
          const colorMap: Record<LifecycleMode, string> = {
            [LifecycleMode.ENABLED]: "success",
            [LifecycleMode.DRY_RUN]: "processing",
            [LifecycleMode.DISABLED]: "error",
          };
          return <Tag color={colorMap[mode] || "default"}>{mode}</Tag>;
        }

        return (
          <Select
            value={mode}
            onChange={(newMode) => onModeChange(record.name, newMode)}
            loading={changingMode === record.name}
            disabled={changingMode !== null}
            style={MODE_SELECT_STYLE}
            options={MODE_SELECT_OPTIONS}
          />
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 150,
      render: (
        _: unknown,
        record: { isRunning: boolean; mode: LifecycleMode },
      ) => {
        if (record.mode === LifecycleMode.DISABLED) {
          return <Badge status="default" text="Disabled" />;
        }

        return record.isRunning ? (
          <Badge color="#231b49" status="processing" text="Running" />
        ) : (
          <Badge status="warning" text="Idle" />
        );
      },
    },
    {
      title: "Provisioned",
      key: "provisioned",
      render: (_: unknown, record: { isProvisioned: boolean }) =>
        record.isProvisioned ? (
          <Tag color="processing">Yes</Tag>
        ) : (
          <Tag color="orange">No</Tag>
        ),
    },
  ];

  return (
    <div style={{ margin: "2em" }}>
      <Typography.Title level={3}>
        Lifecycles
        {props.permissions?.fullAccess ? (
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => setCreatingLifecycle(true)}
            title="Add"
          />
        ) : null}
        <Modal
          title="Add a new lifecycle"
          centered
          open={creatingLifecycle}
          footer={null}
          onCancel={() => setCreatingLifecycle(false)}
        >
          <LifecycleSettingsForm
            client={props.client}
            onCreated={async () => {
              setCreatingLifecycle(false);
            }}
            sourceBuckets={buckets.map((bucket) => bucket.name)}
          />
        </Modal>
      </Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={isLoadingLifecycles}
      />
    </div>
  );
}
