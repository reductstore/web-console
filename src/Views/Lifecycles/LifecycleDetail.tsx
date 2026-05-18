import React, { useEffect, useState } from "react";
import {
  APIError,
  BucketInfo,
  Client,
  FullLifecycleInfo,
  LifecycleMode,
  TokenPermissions,
} from "reduct-js";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Card,
  Descriptions,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import LifecycleSettingsForm from "../../Components/Lifecycle/LifecycleSettingsForm";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import {
  MODE_SELECT_OPTIONS,
  MODE_SELECT_STYLE,
} from "../../Components/Lifecycle/LifecycleModeUtils";

interface Props {
  client: Client;
  permissions?: TokenPermissions;
}

export default function LifecycleDetail(props: Readonly<Props>) {
  const { name } = useParams() as { name: string };
  const navigate = useNavigate();

  const [lifecycle, setLifecycle] = useState<FullLifecycleInfo>();
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [changeSettings, setChangeSettings] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);
  const [modeError, setModeError] = useState<string | null>(null);
  const [changingMode, setChangingMode] = useState(false);

  const getLifecycle = async () => {
    try {
      setLifecycle(await props.client.getLifecycle(name));
    } catch (err) {
      console.error(err);
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
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    getLifecycle().then();
    const interval = setInterval(() => getLifecycle(), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getBuckets().then();
    const interval = setInterval(() => getBuckets(), 5000);
    return () => clearInterval(interval);
  }, []);

  const onModeChange = async (newMode: LifecycleMode) => {
    if (!lifecycle) {
      return;
    }

    setChangingMode(true);
    setModeError(null);
    try {
      await props.client.setLifecycleMode(lifecycle.info.name, newMode);
      await getLifecycle();

      if (newMode === LifecycleMode.ENABLED) {
        message.success(`Lifecycle "${lifecycle.info.name}" enabled.`);
      } else if (newMode === LifecycleMode.DRY_RUN) {
        message.success(`Lifecycle "${lifecycle.info.name}" set to dry run.`);
      } else if (newMode === LifecycleMode.DISABLED) {
        message.success(`Lifecycle "${lifecycle.info.name}" disabled.`);
      }
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        setModeError(err.message);
        message.error(`Failed to change lifecycle mode: ${err.message}`);
      } else {
        setModeError("Failed to change lifecycle mode.");
        message.error("Failed to change lifecycle mode.");
      }
    } finally {
      setChangingMode(false);
    }
  };

  const onRemove = async () => {
    if (!lifecycle) {
      return;
    }

    try {
      await props.client.deleteLifecycle(lifecycle.info.name);
      setRemoveError(null);
      setIsRemoveModalOpen(false);
      navigate("/lifecycles");
    } catch (err) {
      console.error(err);
      if (err instanceof APIError && err.message) {
        setRemoveError(err.message);
      } else {
        setRemoveError("Failed to remove lifecycle.");
      }
    }
  };

  const getStatusTag = () => {
    if (!lifecycle) {
      return null;
    }

    if (lifecycle.info.mode === LifecycleMode.DISABLED) {
      return <Badge status="default" text="Disabled" />;
    }

    if (lifecycle.info.isRunning) {
      return <Badge color="#231b49" status="processing" text="Running" />;
    }

    return <Badge status="warning" text="Idle" />;
  };

  const formatWhenCondition = (when: unknown): string => {
    if (when === undefined || when === null) {
      return "";
    }

    if (typeof when === "string") {
      try {
        const parsed = JSON.parse(when);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return when;
      }
    }

    try {
      return JSON.stringify(when, null, 2);
    } catch {
      return String(when);
    }
  };

  const colorizeJson = (json: string): React.ReactNode => {
    const regex =
      /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;
    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(json)) !== null) {
      if (match.index > lastIndex) {
        result.push(json.slice(lastIndex, match.index));
      }
      if (match[1] && match[2]) {
        result.push(
          <span key={key++} style={{ color: "#0451a5" }}>
            {match[1]}
          </span>,
        );
        result.push(match[2]);
      } else if (match[1]) {
        result.push(
          <span key={key++} style={{ color: "#a31515" }}>
            {match[1]}
          </span>,
        );
      } else if (match[3]) {
        result.push(
          <span key={key++} style={{ color: "#098658" }}>
            {match[3]}
          </span>,
        );
      } else if (match[4]) {
        result.push(
          <span key={key++} style={{ color: "#0000ff" }}>
            {match[4]}
          </span>,
        );
      } else if (match[5]) {
        result.push(
          <span key={key++} style={{ color: "#0000ff" }}>
            {match[5]}
          </span>,
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < json.length) {
      result.push(json.slice(lastIndex));
    }
    return result;
  };

  if (!lifecycle) {
    return <div style={{ margin: "2em" }} />;
  }

  const readOnly =
    !props.permissions?.fullAccess || lifecycle.info.isProvisioned;
  const canChangeMode = !!props.permissions?.fullAccess;

  return (
    <div style={{ padding: "2em", width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: "0.5em" }}>
        Lifecycle Policy
      </Typography.Title>
      <Card
        title={lifecycle.info.name}
        extra={getStatusTag()}
        actions={[
          <Tooltip title="Back" key="back">
            <ArrowLeftOutlined
              aria-label="Back"
              onClick={() => navigate("/lifecycles")}
            />
          </Tooltip>,
          readOnly ? (
            <Tooltip
              title={
                lifecycle.info.isProvisioned
                  ? "Cannot modify provisioned lifecycle"
                  : "No permission to modify"
              }
              key="settings"
            >
              <SettingOutlined
                aria-label="Settings"
                style={{ color: "gray", cursor: "not-allowed" }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Settings" key="settings">
              <SettingOutlined
                aria-label="Settings"
                onClick={() => setChangeSettings(true)}
              />
            </Tooltip>
          ),
          readOnly ? (
            <Tooltip
              title={
                lifecycle.info.isProvisioned
                  ? "Cannot remove provisioned lifecycle"
                  : "No permission to remove"
              }
              key="delete"
            >
              <DeleteOutlined
                aria-label="Remove"
                style={{ color: "gray", cursor: "not-allowed" }}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Remove" key="delete">
              <DeleteOutlined
                aria-label="Remove"
                style={{ color: "red" }}
                onClick={() => setIsRemoveModalOpen(true)}
              />
            </Tooltip>
          ),
        ]}
      >
        <Space orientation="vertical" size={22} style={{ width: "100%" }}>
          <Descriptions
            column={isSmallScreen ? 1 : 2}
            bordered
            size="small"
            layout={isSmallScreen ? "vertical" : "horizontal"}
          >
            <Descriptions.Item label="Type">
              <Tag color="red">
                {(lifecycle.settings.lifecycleType ?? "delete").toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Provisioned">
              {lifecycle.info.isProvisioned ? (
                <Tag color="processing">Yes</Tag>
              ) : (
                <Tag color="orange">No</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Bucket">
              {lifecycle.settings.bucket}
            </Descriptions.Item>
            <Descriptions.Item label="Max Age">
              {lifecycle.settings.maxAge}
            </Descriptions.Item>
            <Descriptions.Item label="Mode">
              <Select
                style={MODE_SELECT_STYLE}
                value={lifecycle.info.mode}
                onChange={onModeChange}
                loading={changingMode}
                disabled={!canChangeMode}
                status={modeError ? "error" : undefined}
                data-testid="mode-select"
                size="small"
                options={MODE_SELECT_OPTIONS}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Interval">
              {lifecycle.settings.interval || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Entries" span="filled">
              <Typography.Paragraph
                style={{
                  marginBottom: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
                ellipsis={{ rows: 2, expandable: true, symbol: "more" }}
              >
                {lifecycle.settings.entries.length > 0
                  ? lifecycle.settings.entries.join(", ")
                  : "All"}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="When" span="filled">
              {formatWhenCondition(lifecycle.settings.when) ? (
                <pre
                  style={{ margin: 0, fontSize: 13, fontFamily: "monospace" }}
                >
                  {colorizeJson(formatWhenCondition(lifecycle.settings.when))}
                </pre>
              ) : (
                "—"
              )}
            </Descriptions.Item>
          </Descriptions>

          {modeError && <Alert type="error" title={modeError} showIcon />}
        </Space>

        <RemoveConfirmationModal
          name={lifecycle.info.name}
          onRemove={onRemove}
          onCancel={() => {
            setIsRemoveModalOpen(false);
            setRemoveError(null);
          }}
          open={isRemoveModalOpen}
          resourceType="lifecycle"
          errorMessage={removeError}
        />

        <Modal
          title="Settings"
          open={changeSettings}
          footer={null}
          centered
          onCancel={() => setChangeSettings(false)}
          data-testid="settings-modal"
        >
          <LifecycleSettingsForm
            key={lifecycle.info.name}
            client={props.client}
            readOnly={readOnly}
            onCreated={() => {
              setChangeSettings(false);
              message.success("Settings saved");
              getLifecycle().then();
            }}
            sourceBuckets={buckets.map((bucket) => bucket.name)}
            lifecycleName={lifecycle.info.name}
          />
        </Modal>
      </Card>
    </div>
  );
}
