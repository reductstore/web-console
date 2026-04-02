import React, { useEffect, useRef } from "react";
import { Button, Popconfirm, Select, Tooltip, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useQueryStore, SavedQuery } from "../../stores/queryStore";

interface QuerySelectorProps {
  bucketName: string;
  entryName: string;
  onLoadQuery: (saved: SavedQuery) => void;
  editable: boolean;
}

export default function QuerySelector({
  bucketName,
  entryName,
  onLoadQuery,
  editable,
}: QuerySelectorProps) {
  const { getQueries, deleteQuery, getLoadedQueryName, setLoadedQueryName } =
    useQueryStore();
  const queries = getQueries(bucketName, entryName);
  const loadedQueryName = getLoadedQueryName(bucketName, entryName);
  const didAutoLoad = useRef(false);

  // Auto-load last used query when navigating to this entry
  useEffect(() => {
    didAutoLoad.current = false;
  }, [bucketName, entryName]);

  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    if (loadedQueryName) {
      const query = queries.find((q) => q.name === loadedQueryName);
      if (query) {
        onLoadQuery(query);
      }
    }
  }, [bucketName, entryName, loadedQueryName, queries, onLoadQuery]);

  const handleSelect = (name: string) => {
    const query = queries.find((q) => q.name === name);
    if (query) {
      onLoadQuery(query);
      setLoadedQueryName(bucketName, entryName, query.name);
    }
  };

  const handleDelete = (name: string) => {
    deleteQuery(bucketName, entryName, name);
  };

  const handleClear = () => {
    setLoadedQueryName(bucketName, entryName, null);
  };

  if (queries.length === 0) return null;

  return (
    <Select<string>
      size="small"
      placeholder="Load saved query..."
      loading={false}
      value={loadedQueryName ?? undefined}
      onSelect={handleSelect}
      style={{ minWidth: 200 }}
      data-testid="query-selector"
      popupRender={(menu) => menu}
      optionLabelProp="label"
      allowClear
      onClear={handleClear}
    >
      {queries.map((q) => (
        <Select.Option key={q.name} value={q.name} label={q.name}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography.Text>{q.name}</Typography.Text>
            {editable && (
              <Popconfirm
                title={`Delete query "${q.name}"?`}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(q.name);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete query">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`delete-query-${q.name}`}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        </Select.Option>
      ))}
    </Select>
  );
}
