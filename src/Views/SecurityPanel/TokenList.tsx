import React, { useEffect, useState } from "react";
import { Client, Token } from "reduct-js";
import { Link, useNavigate } from "react-router-dom";
import { Button, message, Table, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import humanizeDuration from "humanize-duration";

interface Props {
  client: Client;
}

export default function TokenList(props: Readonly<Props>) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const { client } = props;
    setIsLoading(true);
    client
      .getTokenList()
      .then((tokens) => {
        setTokens(tokens);
        setIsLoading(false);
      })
      .catch((err) => {
        message.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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
      render: (time: number) => new Date(time).toISOString(),
    },
    {
      title: "Expires At",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (time?: number) =>
        time !== undefined ? new Date(time).toISOString() : "—",
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
        time !== undefined ? new Date(time).toISOString() : "—",
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
        <Button
          style={{ float: "right" }}
          icon={<PlusOutlined />}
          onClick={() => navigate("/tokens/new_token?isNew=true")}
          title="Add"
        />
      </Typography.Title>
      <Table
        id="TokenTable"
        columns={columns}
        dataSource={tokens}
        loading={isLoading}
        rowKey="name"
      />
    </div>
  );
}
