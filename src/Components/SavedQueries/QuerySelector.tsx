import React, { useEffect, useRef } from "react";
import { Button, Popconfirm, Select, Tooltip, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import {
  useQueryStore,
  SavedQuery,
  formatQueryKey,
} from "../../stores/queryStore";

interface QuerySelectorProps {
  bucketName: string;
  entryName: string | string[];
  onLoadQuery: (saved: SavedQuery) => void;
  editable: boolean;
  showAllQueries?: boolean;
}

export default function QuerySelector({
  bucketName,
  entryName,
  onLoadQuery,
  editable,
  showAllQueries = false,
}: QuerySelectorProps) {
  const {
    getQueries,
    getAllQueries,
    deleteQuery,
    deleteQueryByKey,
    getLoadedQueryName,
    setLoadedQueryName,
  } = useQueryStore();
  const currentQueries = getQueries(bucketName, entryName);
  const allQueryGroups = getAllQueries();
  const loadedQueryName = getLoadedQueryName(bucketName, entryName);
  const didAutoLoad = useRef(false);

  const currentKey = (() => {
    const entries = Array.isArray(entryName) ? entryName : [entryName];
    const normalized = Array.from(
      new Set(entries.map((e) => e.trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
    if (normalized.length === 1) return `${bucketName}/${normalized[0]}`;
    return `${bucketName}/__multi__/${normalized.join("\u0001")}`;
  })();

  const otherGroups = showAllQueries
    ? allQueryGroups.filter((g) => g.key !== currentKey)
    : [];

  // Auto-load last used query when navigating to this entry
  useEffect(() => {
    didAutoLoad.current = false;
  }, [bucketName, entryName]);

  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;

    if (loadedQueryName) {
      const query = currentQueries.find((q) => q.name === loadedQueryName);
      if (query) {
        onLoadQuery(query);
      }
    }
  }, [bucketName, entryName, loadedQueryName, currentQueries, onLoadQuery]);

  const handleSelect = (value: string) => {
    // value format: "key::name" for other groups, just "name" for current
    const sepIdx = value.indexOf("::");
    if (sepIdx !== -1) {
      const sourceKey = value.substring(0, sepIdx);
      const queryName = value.substring(sepIdx + 2);
      const group = allQueryGroups.find((g) => g.key === sourceKey);
      const query = group?.queries.find((q) => q.name === queryName);
      if (query) {
        onLoadQuery(query);
        // Set loaded name on the target bucket/entries context
        if (query.bucketName && query.entries?.length) {
          setLoadedQueryName(query.bucketName, query.entries, query.name);
        }
      }
    } else {
      const query = currentQueries.find((q) => q.name === value);
      if (query) {
        onLoadQuery(query);
        setLoadedQueryName(bucketName, entryName, query.name);
      }
    }
  };

  const handleDelete = (name: string) => {
    deleteQuery(bucketName, entryName, name);
  };

  const handleClear = () => {
    setLoadedQueryName(bucketName, entryName, null);
  };

  const totalQueries =
    currentQueries.length +
    otherGroups.reduce((sum, g) => sum + g.queries.length, 0);
  if (totalQueries === 0) return null;

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
      popupMatchSelectWidth={false}
    >
      {currentQueries.map((q) => (
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
      {otherGroups.map((group) => (
        <Select.OptGroup key={group.key} label={formatQueryKey(group.key)}>
          {group.queries.map((q) => (
            <Select.Option
              key={`${group.key}::${q.name}`}
              value={`${group.key}::${q.name}`}
              label={`${q.name} (${formatQueryKey(group.key)})`}
            >
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
                      deleteQueryByKey(group.key, q.name);
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
                      />
                    </Tooltip>
                  </Popconfirm>
                )}
              </div>
            </Select.Option>
          ))}
        </Select.OptGroup>
      ))}
    </Select>
  );
}
