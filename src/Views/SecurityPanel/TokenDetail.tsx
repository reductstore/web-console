import React, { useEffect, useState } from "react";
import { Client, Token, TokenCreateRequest } from "reduct-js";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Button,
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
  Typography,
} from "antd";
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

  const [tokenError, setTokenError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmName, setConfirmName] = useState(false);

  const navigate = useNavigate();

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
      <Typography.Title level={3}>Access Token</Typography.Title>,

      <Input
        name="name"
        disabled={!isNew}
        value={token.name}
        onChange={(event) => setToken({ ...token, name: event.target.value })}
      />,
      <Checkbox
        name="fullAccess"
        disabled={!isNew}
        checked={token.permissions?.fullAccess}
        onChange={(event) =>
          setPermissions({ fullAccess: event.target.checked })
        }
      >
        Full Access
      </Checkbox>,
      <Space.Compact block orientation={"vertical"}>
        Read Access:
        <Select
          id="ReadSelect"
          disabled={!isNew}
          mode="tags"
          value={token.permissions?.read}
          options={[...bucketOptions, { value: "*", label: "*" }]}
          onChange={(value) => setPermissions({ read: value })}
        />
      </Space.Compact>,
      <Space.Compact block orientation={"vertical"}>
        Write Access:
        <Select
          id="WriteSelect"
          disabled={!isNew}
          mode="tags"
          value={token.permissions?.write}
          options={[...bucketOptions, { value: "*", label: "*" }]}
          onChange={(value) => setPermissions({ write: value })}
        />
      </Space.Compact>,

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
          column={1}
          bordered
          size="small"
          style={{ marginTop: "1em" }}
        >
          <Descriptions.Item label="Status">
            {token.isExpired ? (
              <Tag color="error">Expired</Tag>
            ) : (
              <Tag color="success">Active</Tag>
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
          <Descriptions.Item label="IP Allowlist">
            {token.ipAllowlist && token.ipAllowlist.length > 0
              ? token.ipAllowlist.join(", ")
              : "—"}
          </Descriptions.Item>
        </Descriptions>
      ) : null,

      <Space>
        <Button onClick={() => navigate("/tokens")}>Back</Button>
        {isNew ? (
          <Button
            className="CreateButton"
            type={"primary"}
            onClick={() => createToken()}
          >
            Create
          </Button>
        ) : (
          <>
            <Button
              className="RotateButton"
              type="primary"
              disabled={token.isProvisioned || token.isExpired}
              onClick={() => rotateToken()}
            >
              Rotate
            </Button>
            <Button
              className="RemoveButton"
              danger
              disabled={token.isProvisioned}
              type="primary"
              onClick={() => setConfirmRemove(true)}
            >
              Remove
            </Button>
          </>
        )}

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
      </Space>,
    ];
  };

  return (
    <Space
      orientation={"vertical"}
      size={"large"}
      style={{ margin: "2em", width: "70%" }}
    >
      {token === undefined ? <div /> : renderTokenDetails()}
    </Space>
  );
}
