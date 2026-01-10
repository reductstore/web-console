import React, { useEffect, useState } from "react";
import {
  APIError,
  ReplicationInfo,
  ReplicationMode,
  Client,
  TokenPermissions,
  BucketInfo,
} from "reduct-js";
import { Button, message, Modal, Select, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import "../../App.css";
import {
  MODE_SELECT_OPTIONS,
  MODE_SELECT_STYLE,
} from "../../Components/Replication/ReplicationModeUtils";
import { Link } from "react-router-dom";
import ReplicationSettingsForm from "../../Components/Replication/ReplicationSettingsForm";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

/**
 * Replications View
 */
export default function Replications(props: Readonly<Props>) {
  const [replications, setReplications] = useState<ReplicationInfo[]>([]);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingReplications, setIsLoadingReplications] = useState(true);

  const [creatingReplication, setCreatingReplication] = useState(false);
  const [changingMode, setChangingMode] = useState<string | null>(null);

  const onModeChange = async (name: string, newMode: ReplicationMode) => {
    setChangingMode(name);
    try {
      await props.client.setReplicationMode(name, newMode);
      await getReplications();
      if (newMode === ReplicationMode.ENABLED) {
        message.success(`Replication "${name}" enabled.`);
      } else if (newMode === ReplicationMode.PAUSED) {
        message.success(`Replication "${name}" paused.`);
      } else if (newMode === ReplicationMode.DISABLED) {
        message.success(`Replication "${name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        message.error(`Failed to change replication mode: ${err.message}`);
      } else {
        message.error("Failed to change replication mode.");
      }
    } finally {
      setChangingMode(null);
    }
  };

  const getReplications = async () => {
    try {
      setIsLoadingReplications(true);
      const { client } = props;
      const replicationList: ReplicationInfo[] =
        await client.getReplicationList();
      setReplications(replicationList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReplications(false);
    }
  };

  const getBuckets = async () => {
    try {
      const { client } = props;
      const bucketList: BucketInfo[] = await client.getBucketList();
      setBuckets(bucketList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getReplications().then();
    const interval = setInterval(() => getReplications(), 5000);
    return () => clearInterval(interval);
  }, [creatingReplication]);

  useEffect(() => {
    getBuckets().then();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const data = replications.map((replication, index) => {
    return {
      key: `replication-${index}`,
      name: replication.name,
      isActive: replication.isActive,
      mode: replication.mode,
      isProvisioned: replication.isProvisioned,
      pendingRecords: replication.pendingRecords.toString(),
    };
  });

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Link to={`replications/${text}`}>
          <b>{text}</b>
        </Link>
      ),
    },
    {
      title: "Mode",
      dataIndex: "mode",
      key: "mode",
      render: (
        mode: ReplicationMode,
        record: { name: string; isProvisioned: boolean },
      ) => {
        const canChangeMode = props.permissions?.fullAccess;
        if (!canChangeMode) {
          const colorMap: Record<ReplicationMode, string> = {
            [ReplicationMode.ENABLED]: "success",
            [ReplicationMode.PAUSED]: "warning",
            [ReplicationMode.DISABLED]: "error",
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
      title: "Pending Records",
      dataIndex: "pendingRecords",
      key: "pendingRecords",
    },
    {
      title: "Status",
      key: "status",
      render: (
        _: unknown,
        record: {
          isActive: boolean;
          isProvisioned: boolean;
          mode: ReplicationMode;
        },
      ) => {
        const tags = [];
        if (record.mode === ReplicationMode.DISABLED) {
          tags.push(
            <Tag key="disabled" color="default">
              Inactive
            </Tag>,
          );
        } else if (record.isActive) {
          tags.push(
            <Tag key="reachable" color="success">
              Target Reachable
            </Tag>,
          );
        } else {
          tags.push(
            <Tag key="unreachable" color="error">
              Target Unreachable
            </Tag>,
          );
        }
        if (record.isProvisioned) {
          tags.push(
            <Tag key="provisioned" color="processing">
              Provisioned
            </Tag>,
          );
        }
        return <>{tags}</>;
      },
    },
  ];

  return (
    <div style={{ margin: "2em" }}>
      <Typography.Title level={3}>
        Replications
        {props.permissions?.fullAccess ? (
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => setCreatingReplication(true)}
            title="Add"
          />
        ) : null}
        <Modal
          title="Add a new replication"
          open={creatingReplication}
          footer={null}
          onCancel={() => setCreatingReplication(false)}
        >
          <ReplicationSettingsForm
            client={props.client}
            onCreated={async () => {
              setCreatingReplication(false);
            }}
            sourceBuckets={buckets.map((bucket) => bucket.name)}
          />
        </Modal>
      </Typography.Title>
      <Table
        columns={columns}
        dataSource={data}
        loading={isLoadingReplications}
      />
    </div>
  );
}
