import React, { useCallback, useEffect, useState } from "react";
import { Client, Token } from "reduct-js";
import { Link, useNavigate } from "react-router-dom";
import { Button, message, Table, Tag, Tooltip, Typography } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import humanizeDuration from "humanize-duration";
import dayjs from "../../Helpers/dayjsConfig";
import { useSelectionMode } from "../../hooks/useSelectionMode";
import { useBulkDelete } from "../../hooks/useBulkDelete";
import BulkRemoveConfirmationModal from "../../Components/BulkRemoveConfirmationModal";

interface Props {
  client: Client;
}

export default function TokenList(props: Readonly<Props>) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

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

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text: string) => (
        <Link to={`/tokens/${text}`}>
          <b>{text}</b>
        </Link>
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
      title: "",
      dataIndex: "isProvisioned",
      key: "provisioned",
      render: (isProvisioned: boolean) => {
        if (isProvisioned) {
          return <Tag color="processing">Provisioned</Tag>;
        } else {
          return <div />;
        }
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
    </div>
  );
}
