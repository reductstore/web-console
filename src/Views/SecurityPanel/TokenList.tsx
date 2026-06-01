import React, { useCallback, useEffect, useState } from "react";
import { Client, Token } from "reduct-js";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Flex,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";
import humanizeDuration from "humanize-duration";
import dayjs from "../../Helpers/dayjsConfig";
import { useSelectionMode } from "../../hooks/useSelectionMode";
import { useBulkDelete } from "../../hooks/useBulkDelete";
import BulkRemoveConfirmationModal from "../../Components/BulkRemoveConfirmationModal";
import RemoveConfirmationModal from "../../Components/RemoveConfirmationModal";
import ActionIcon from "../../Components/ActionIcon";

interface Props {
  client: Client;
}

export default function TokenList(props: Readonly<Props>) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [tokenToRemove, setTokenToRemove] = useState<string>("");
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [rotatedTokenValue, setRotatedTokenValue] = useState<string | null>(
    null,
  );
  const [tokenCopyError, setTokenCopyError] = useState<string | null>(null);
  const [tokenToRotate, setTokenToRotate] = useState<string>("");
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  const navigate = useNavigate();

  const { selectedKeys, clearSelection, rowSelection } = useSelectionMode({
    getDisabledKeys: () =>
      tokens.filter((t) => t.isProvisioned).map((t) => t.name),
  });

  const fetchTokens = useCallback(() => {
    const { client } = props;
    setIsLoading(true);
    client
      .getTokenList()
      .then((tokens) => {
        setTokens(tokens);
      })
      .catch((err) => {
        message.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [props.client]);

  useEffect(() => {
    fetchTokens();
  }, []);

  const {
    handleBulkDelete,
    bulkDeleting,
    bulkProgress,
    bulkError,
    setBulkError,
  } = useBulkDelete({
    onDelete: (name) => props.client.deleteToken(name),
    onSuccess: () => {
      setIsBulkDeleteOpen(false);
      clearSelection();
      fetchTokens();
    },
    onError: (failures) => {
      message.error(`${failures.length} token(s) failed to remove`);
    },
  });

  const onRemoveToken = async () => {
    try {
      await props.client.deleteToken(tokenToRemove);
      setIsRemoveModalOpen(false);
      setRemoveError(null);
      fetchTokens();
    } catch (err: any) {
      setRemoveError(err.message || "Failed to remove token.");
    }
  };

  const onRotateToken = async (name: string) => {
    setRotating(true);
    try {
      const value = await props.client.rotateToken(name);
      setRotatedTokenValue(value);
      setIsRotateModalOpen(false);
    } catch (err: any) {
      message.error(err.message || "Failed to rotate token.");
    } finally {
      setRotating(false);
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Token) => (
        <span>
          <Link to={`/tokens/${text}`}>
            <b>{text}</b>
          </Link>
          {record.isProvisioned ? (
            <Tag color="default" style={{ marginLeft: 8 }}>
              Provisioned
            </Tag>
          ) : null}
        </span>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: Token) => {
        if (record.isExpired) {
          return <Tag color="error">Expired</Tag>;
        }
        return <Tag color="success">Active</Tag>;
      },
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (time: number) => dayjs(time).fromNow(),
    },
    {
      title: "Expires At",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (time?: number) =>
        time !== undefined ? dayjs(time).fromNow() : "—",
    },
    {
      title: "TTL",
      dataIndex: "ttl",
      key: "ttl",
      render: (ttl?: number) => (ttl ? humanizeDuration(ttl * 1000) : "—"),
    },
    {
      title: "Last Access",
      dataIndex: "lastAccess",
      key: "lastAccess",
      render: (time?: number) =>
        time !== undefined ? dayjs(time).fromNow() : "—",
    },
    {
      title: "IP Allowlist",
      dataIndex: "ipAllowlist",
      key: "ipAllowlist",
      render: (ips?: string[]) =>
        ips && ips.length > 0 ? ips.join(", ") : "—",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Token) => {
        if (record.isProvisioned) {
          return (
            <Flex gap="middle" align="center">
              <ActionIcon
                icon={<SyncOutlined style={{ fontSize: "16px" }} />}
                disabled
                tooltip="Provisioned tokens cannot be rotated"
                showTooltipWhenEnabled
              />
              <ActionIcon
                icon={<DeleteOutlined style={{ fontSize: "16px" }} />}
                disabled
                tooltip="Provisioned tokens cannot be removed"
                showTooltipWhenEnabled
              />
            </Flex>
          );
        }
        const isExpired =
          record.expiresAt !== undefined && record.expiresAt < Date.now();
        return (
          <Flex gap="middle" align="center">
            <ActionIcon
              icon={<SyncOutlined style={{ fontSize: "16px" }} />}
              onClick={() => {
                setTokenToRotate(record.name);
                setIsRotateModalOpen(true);
              }}
              disabled={isExpired}
              tooltip={
                isExpired ? "Cannot rotate expired token" : "Rotate token"
              }
              showTooltipWhenEnabled
            />
            <ActionIcon
              icon={
                <DeleteOutlined
                  style={{ fontSize: "16px", color: "#ff4d4f" }}
                />
              }
              onClick={() => {
                setTokenToRemove(record.name);
                setRemoveError(null);
                setIsRemoveModalOpen(true);
              }}
              tooltip="Delete token"
              showTooltipWhenEnabled
            />
          </Flex>
        );
      },
    },
  ];

  return (
    <div style={{ margin: "2em" }}>
      <Typography.Title level={3}>
        Access Tokens
        <Tooltip title="Create token" placement="bottomLeft">
          <Button
            style={{ float: "right" }}
            icon={<PlusOutlined />}
            onClick={() => navigate("/tokens/new_token?isNew=true")}
            aria-label="Add"
          />
        </Tooltip>
        <Tooltip
          title={
            selectedKeys.length > 0
              ? `Delete ${selectedKeys.length} selected`
              : "Select tokens to delete"
          }
          placement="bottomLeft"
        >
          <Button
            style={{ float: "right", marginRight: 8 }}
            icon={<DeleteOutlined />}
            onClick={() => setIsBulkDeleteOpen(true)}
            danger
            disabled={selectedKeys.length === 0}
          />
        </Tooltip>
      </Typography.Title>
      <Table
        id="TokenTable"
        columns={columns}
        dataSource={tokens}
        loading={isLoading}
        rowKey="name"
        rowSelection={rowSelection}
      />
      <BulkRemoveConfirmationModal
        count={selectedKeys.length}
        resourceType="token"
        open={isBulkDeleteOpen}
        onConfirm={() => handleBulkDelete(selectedKeys)}
        onCancel={() => {
          setIsBulkDeleteOpen(false);
          setBulkError(null);
        }}
        loading={bulkDeleting}
        progress={bulkProgress ?? undefined}
        errorMessage={bulkError}
      />
      <RemoveConfirmationModal
        name={tokenToRemove}
        onRemove={onRemoveToken}
        onCancel={() => {
          setIsRemoveModalOpen(false);
          setRemoveError(null);
        }}
        resourceType="token"
        open={isRemoveModalOpen}
        errorMessage={removeError}
      />
      <Modal
        title="Rotate Token"
        open={isRotateModalOpen}
        onOk={() => onRotateToken(tokenToRotate)}
        onCancel={() => setIsRotateModalOpen(false)}
        okText="Rotate"
        confirmLoading={rotating}
      >
        <p>
          Are you sure you want to rotate token <b>{tokenToRotate}</b>? The
          current token value will be invalidated and a new value will be
          generated.
        </p>
      </Modal>
      <Modal
        open={!!rotatedTokenValue}
        closable={false}
        footer={[
          <Button
            key="submit"
            type="primary"
            onClick={async () => {
              if (!rotatedTokenValue || tokenCopyError) {
                setRotatedTokenValue(null);
                setTokenCopyError(null);
                return;
              }
              try {
                await navigator.clipboard.writeText(rotatedTokenValue);
                setRotatedTokenValue(null);
                setTokenCopyError(null);
              } catch {
                setTokenCopyError(
                  "Failed to copy token to clipboard. Please copy it manually.",
                );
              }
            }}
          >
            {tokenCopyError ? "Close" : "Copy To Clipboard And Close"}
          </Button>,
        ]}
      >
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Alert
            type="success"
            title="This is your new token value. Please save it somewhere, because it will not be shown again."
          />
          {tokenCopyError && (
            <Alert
              title={tokenCopyError}
              type="error"
              closable={{ onClose: () => setTokenCopyError(null) }}
            />
          )}
          <Input.TextArea
            value={rotatedTokenValue ?? ""}
            readOnly
            autoSize={{ minRows: 4 }}
          />
        </Space>
      </Modal>
    </div>
  );
}
