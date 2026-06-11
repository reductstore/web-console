import React, { useEffect, useState } from "react";
import { Client, Token, TokenCreateRequest } from "reduct-js";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  SelectProps,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "../../Helpers/dayjsConfig";
import humanizeDuration from "humanize-duration";

interface Props {
  client: Client;
}

function useQueryParams() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  return new Proxy(params, {
    get(target, prop) {
      // @ts-ignore
      return target.get(prop);
    },
  });
}

export default function TokenDetail(props: Readonly<Props>) {
  const { name } = useParams() as { name: string };
  // @ts-ignore
  const { isNew } = useQueryParams();

  const [token, setToken] = useState<Token>(undefined as unknown as Token);
  const [bucketOptions, setBucketOptions] = useState<SelectProps[]>([]);
  const [tokenValue, setTokenValue] = useState<string>();
  const [ttl, setTtl] = useState<number | undefined>();
  const [expiresAt, setExpiresAt] = useState<number | undefined>();
  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  const [tokenError, setTokenError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmName, setConfirmName] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const { client } = props;

    if (isNew) {
      client
        .getBucketList()
        .then((buckets) =>
          setBucketOptions(
            buckets.map((b) => {
              return { value: b.name, label: b.name };
            }),
          ),
        )
        .catch((err) => message.error(err.message));

      setToken({
        createdAt: Date.now(),
        isProvisioned: false,
        name: "new_token",
        permissions: { fullAccess: false, read: [], write: [] },
      });
      return;
    }

    client
      .getToken(name)
      .then((token) => setToken(token))
      .catch((err) => message.error(err.message));
  }, []);

  const removeToken = () => {
    const { client } = props;
    client
      .deleteToken(name)
      .then(() => navigate("/tokens"))
      .catch((err) => message.error(err.message));
  };

  const createToken = () => {
    if (token.permissions === undefined) {
      message.error("Permissions must be set");
      return;
    }
    const { client } = props;

    const request: TokenCreateRequest = {
      permissions: token.permissions,
      ttl,
      expiresAt,
      ipAllowlist: ipAllowlist.length > 0 ? ipAllowlist : undefined,
    };
    client
      .createToken(token.name, request)
      .then((value) => setTokenValue(value))
      .catch((err) => message.error(err.message));
  };

  const cancelCreatedToken = () => {
    const { client } = props;
    client.deleteToken(token.name).catch((err) => message.error(err.message));
  };

  const rotateToken = () => {
    const { client } = props;
    client
      .rotateToken(name)
      .then((value) => setTokenValue(value))
      .catch((err) => message.error(err.message));
  };

  const setPermissions = (permissions?: {
    fullAccess?: boolean;
    read?: string[];
    write?: string[];
  }) => {
    if (permissions === undefined) {
      return;
    }

    if (token.permissions === undefined) {
      return;
    }

    let { fullAccess, read, write } = permissions;
    fullAccess =
      fullAccess === undefined ? token.permissions.fullAccess : fullAccess;
    read =
      read === undefined
        ? token.permissions.read
        : read?.map((item) => item.trim());
    write =
      write === undefined
        ? token.permissions.write
        : write?.map((item) => item.trim());

    setToken({ ...token, permissions: { fullAccess, read, write } });
  };

  const renderTokenDetails = () => {
    return [
      isNew ? (
        <Input
          name="name"
          value={token.name}
          onChange={(event) => setToken({ ...token, name: event.target.value })}
        />
      ) : null,
      isNew ? (
        <Checkbox
          name="fullAccess"
          checked={token.permissions?.fullAccess}
          onChange={(event) =>
            setPermissions({ fullAccess: event.target.checked })
          }
        >
          Full Access
        </Checkbox>
      ) : null,
      isNew ? (
        <Space.Compact block orientation={"vertical"}>
          Read Access:
          <Select
            id="ReadSelect"
            mode="tags"
            value={token.permissions?.read}
            options={[...bucketOptions, { value: "*", label: "*" }]}
            onChange={(value) => setPermissions({ read: value })}
          />
        </Space.Compact>
      ) : null,
      isNew ? (
        <Space.Compact block orientation={"vertical"}>
          Write Access:
          <Select
            id="WriteSelect"
            mode="tags"
            value={token.permissions?.write}
            options={[...bucketOptions, { value: "*", label: "*" }]}
            onChange={(value) => setPermissions({ write: value })}
          />
        </Space.Compact>
      ) : null,

      isNew ? (
        <>
          <Space.Compact block orientation={"vertical"}>
            TTL (seconds):
            <InputNumber
              id="TtlInput"
              min={1}
              precision={0}
              value={ttl}
              onChange={(value) => setTtl(value ?? undefined)}
              placeholder="No TTL"
              style={{ width: "100%" }}
            />
          </Space.Compact>
          <Space.Compact block orientation={"vertical"}>
            Expires At:
            <DatePicker
              id="ExpiresAtPicker"
              showTime
              value={expiresAt ? dayjs.utc(expiresAt) : null}
              onChange={(date) =>
                setExpiresAt(date ? date.utc().valueOf() : undefined)
              }
              style={{ width: "100%" }}
            />
          </Space.Compact>
          <Space.Compact block orientation={"vertical"}>
            IP Allowlist:
            <Select
              id="IpAllowlistSelect"
              mode="tags"
              open={false}
              suffixIcon={null}
              value={ipAllowlist}
              onChange={(value) => setIpAllowlist(value)}
              placeholder="e.g. 192.168.1.0/24"
            />
          </Space.Compact>
        </>
      ) : !isNew ? (
        <Descriptions
          column={isSmallScreen ? 1 : 2}
          bordered
          size="small"
          layout={isSmallScreen ? "vertical" : "horizontal"}
        >
          <Descriptions.Item label="Full Access">
            {token.permissions?.fullAccess ? (
              <Tag color="processing">Yes</Tag>
            ) : (
              <Tag color="orange">No</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Provisioned">
            {token.isProvisioned ? (
              <Tag color="processing">Yes</Tag>
            ) : (
              <Tag color="orange">No</Tag>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Expires At">
            {token.expiresAt !== undefined
              ? dayjs(token.expiresAt).fromNow()
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="TTL">
            {token.ttl ? humanizeDuration(token.ttl * 1000) : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Last Access">
            {token.lastAccess !== undefined
              ? dayjs(token.lastAccess).fromNow()
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="IP Allowlist" span="filled">
            {token.ipAllowlist && token.ipAllowlist.length > 0
              ? token.ipAllowlist.join(", ")
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Read Access" span="filled">
            {token.permissions?.read && token.permissions.read.length > 0
              ? token.permissions.read.join(", ")
              : "—"}
          </Descriptions.Item>
          <Descriptions.Item label="Write Access" span="filled">
            {token.permissions?.write && token.permissions.write.length > 0
              ? token.permissions.write.join(", ")
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      ) : null,
    ];
  };

  const renderModals = () => {
    if (!token) return null;
    return (
      <>
        <Modal
          open={confirmRotate}
          closable={false}
          title="Rotate Token"
          onOk={() => {
            setConfirmRotate(false);
            rotateToken();
          }}
          onCancel={() => setConfirmRotate(false)}
          okText="Rotate"
        >
          <p>
            Are you sure you want to rotate token <b>{token.name}</b>? The
            current token value will be invalidated and a new value will be
            generated.
          </p>
        </Modal>

        <Modal
          open={confirmRemove}
          closable={false}
          title={`Remove token "${token.name}"?`}
          confirmLoading={!confirmName}
          data-testid="remove-token-modal"
          footer={[
            <Button key="back" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>,
            <Button
              key="submit"
              type="default"
              danger
              onClick={removeToken}
              disabled={!confirmName}
              loading={!confirmName}
            >
              Remove Token
            </Button>,
          ]}
        >
          <p>
            For confirmation type <b>{token.name}</b>
          </p>
          <Form.Item name="confirm">
            <Input
              onChange={(e) => setConfirmName(token?.name === e.target.value)}
              data-testid="remove-confirm-input"
            />
          </Form.Item>
        </Modal>

        <Modal
          open={!!tokenValue}
          closable={false}
          footer={[
            isNew ? (
              <Button
                key="back"
                onClick={async () => {
                  cancelCreatedToken();
                  setTokenError(undefined);
                  setTokenValue(undefined);
                }}
              >
                Cancel
              </Button>
            ) : null,
            <Button
              key="submit"
              type="primary"
              onClick={async () => {
                if (!tokenValue || tokenError) {
                  setTokenValue(undefined);
                  setTokenError(undefined);
                  navigate("/tokens");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(tokenValue);
                  navigate("/tokens");
                } catch {
                  setTokenError(
                    "Failed to copy token to clipboard. Please copy it manually.",
                  );
                }
              }}
            >
              {tokenError ? "Close" : "Copy To Clipboard And Close"}
            </Button>,
          ]}
        >
          <Space orientation="vertical" size="large">
            <Alert
              type="success"
              title="This is your token value. Please, save it somewhere, because it will not be shown again."
            />
            {tokenError && (
              <Alert
                className="Alert"
                title={tokenError}
                type="error"
                closable={{ onClose: () => setTokenError(undefined) }}
              />
            )}
            <Input.TextArea
              value={tokenValue ? tokenValue : ""}
              readOnly
              autoSize={{ minRows: 4 }}
            />
          </Space>
        </Modal>
      </>
    );
  };

  const getCardActions = () => {
    if (!token) return undefined;

    if (isNew) {
      return [
        <Tooltip title="Back" key="back">
          <ArrowLeftOutlined onClick={() => navigate("/tokens")} />
        </Tooltip>,
        <Tooltip title="Create" key="create">
          <PlusOutlined
            className="CreateButton"
            onClick={() => createToken()}
          />
        </Tooltip>,
      ];
    }

    return [
      <Tooltip title="Back" key="back">
        <ArrowLeftOutlined onClick={() => navigate("/tokens")} />
      </Tooltip>,
      token.isProvisioned ? (
        <Tooltip title="Cannot rotate provisioned token" key="rotate">
          <ReloadOutlined
            className="RotateButton"
            data-disabled="true"
            style={{ color: "gray", cursor: "not-allowed" }}
          />
        </Tooltip>
      ) : token.expiresAt !== undefined && token.expiresAt < Date.now() ? (
        <Tooltip title="Cannot rotate expired token" key="rotate">
          <ReloadOutlined
            className="RotateButton"
            data-disabled="true"
            style={{ color: "gray", cursor: "not-allowed" }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="Rotate" key="rotate">
          <ReloadOutlined
            className="RotateButton"
            onClick={() => setConfirmRotate(true)}
          />
        </Tooltip>
      ),
      token.isProvisioned ? (
        <Tooltip title="Cannot remove provisioned token" key="delete">
          <DeleteOutlined
            className="RemoveButton"
            data-disabled="true"
            style={{ color: "gray", cursor: "not-allowed" }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="Remove" key="delete">
          <DeleteOutlined
            className="RemoveButton"
            style={{ color: "red" }}
            onClick={() => setConfirmRemove(true)}
          />
        </Tooltip>
      ),
    ];
  };

  return (
    <div style={{ padding: "2em", width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: "0.5em" }}>
        Access Token
      </Typography.Title>
      <Card
        title={!isNew && token ? token.name : undefined}
        extra={
          !isNew && token ? (
            token.isExpired ? (
              <Badge status="error" text="Expired" />
            ) : (
              <Badge status="success" text="Active" />
            )
          ) : undefined
        }
        actions={token ? getCardActions() : undefined}
      >
        <Space orientation="vertical" size={22} style={{ width: "100%" }}>
          {token === undefined ? <div /> : renderTokenDetails()}
        </Space>
        {renderModals()}
      </Card>
    </div>
  );
}
