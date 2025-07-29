import React, { useEffect, useState } from "react";
import { Client, Token } from "reduct-js";
import { useHistory, useLocation, useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Select,
  SelectProps,
  Space,
  Typography,
} from "antd";

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

  const [error, setError] = useState<string>();
  const [tokenError, setTokenError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmName, setConfirmName] = useState(false);

  const history = useHistory();

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
        .catch((err) => setError(err.message));

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
      .catch((err) => setError(err.message));
  }, []);

  const removeToken = () => {
    const { client } = props;
    client
      .deleteToken(name)
      .then(() => history.push("/tokens"))
      .catch((err) => setError(err.message));
  };

  const createToken = () => {
    if (token.permissions === undefined) {
      setError("Permissions must be set");
      return;
    }
    const { client } = props;
    client
      .createToken(token.name, token.permissions)
      .then((value) => setTokenValue(value))
      .catch((err) => setError(err.message));
  };

  const cancelCreatedToken = () => {
    const { client } = props;
    client.deleteToken(token.name).catch((err) => setError(err.message));
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

    // eslint-disable-next-line prefer-const
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
      <Space.Compact block direction={"vertical"}>
        Read Access:
        <Select
          id="ReadSelect"
          disabled={!isNew}
          mode="tags"
          value={token.permissions?.read}
          options={bucketOptions}
          onChange={(value) => setPermissions({ read: value })}
        ></Select>
      </Space.Compact>,
      <Space.Compact block direction={"vertical"}>
        Write Access:
        <Select
          id="WriteSelect"
          disabled={!isNew}
          mode="tags"
          value={token.permissions?.write}
          options={bucketOptions}
          onChange={(value) => setPermissions({ write: value })}
        ></Select>
      </Space.Compact>,
      <Space>
        <Button onClick={() => history.push("/tokens")}>Back</Button>
        {isNew ? (
          <Button
            className="CreateButton"
            type={"primary"}
            onClick={() => createToken()}
          >
            Create
          </Button>
        ) : (
          <Button
            className="RemoveButton"
            danger
            disabled={token.isProvisioned}
            type="primary"
            onClick={() => setConfirmRemove(true)}
          >
            Remove
          </Button>
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
            <Button
              key="back"
              onClick={async () => {
                cancelCreatedToken();
                setTokenError(undefined);
                setTokenValue(undefined);
              }}
            >
              Cancel
            </Button>,
            <Button
              key="submit"
              type="primary"
              onClick={async () => {
                if (!tokenValue || tokenError) {
                  setTokenValue(undefined);
                  setTokenError(undefined);
                  history.push("/tokens");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(tokenValue);
                  history.push("/tokens");
                } catch (err) {
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
          <Space direction="vertical" size="large">
            <Alert
              type="success"
              message="This is your token value. Please, save it somewhere, because it will not be shown again."
            />
            {tokenError && (
              <Alert
                className="Alert"
                message={tokenError}
                type="error"
                closable
                onClose={() => setTokenError(undefined)}
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
      direction={"vertical"}
      size={"large"}
      style={{ margin: "2em", width: "70%" }}
    >
      {error ? (
        <Alert
          className="Alert"
          message={error}
          type="error"
          closable
          onClose={() => setError(undefined)}
        />
      ) : (
        <div />
      )}
      {token === undefined ? <div /> : renderTokenDetails()}
    </Space>
  );
}
