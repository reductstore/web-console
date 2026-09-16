import React from "react";
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
  onClearQuery?: () => void;
  onQueryDeleted?: (
    bucketName: string,
    entries: string[],
    name: string,
  ) => void;
  loadedQueryName: string | null;
  editable: boolean;
  showAllQueries?: boolean;
}

export default function QuerySelector({
  bucketName,
  entryName,
  onLoadQuery,
  onClearQuery,
  onQueryDeleted,
  loadedQueryName,
  editable,
  showAllQueries = false,
}: QuerySelectorProps) {
  const { getQueries, getAllQueries, deleteQuery, deleteQueryByKey } =
    useQueryStore();
  const currentQueries = getQueries(bucketName, entryName);
  const allQueryGroups = getAllQueries();

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

  const handleSelect = (value: string) => {
    // value format: "key::name" for other groups, just "name" for current
    const sepIdx = value.indexOf("::");
    const query =
      sepIdx !== -1
        ? allQueryGroups
            .find((g) => g.key === value.substring(0, sepIdx))
            ?.queries.find((q) => q.name === value.substring(sepIdx + 2))
        : currentQueries.find((q) => q.name === value);
    if (query) {
      onLoadQuery(query);
    }
  };

  const handleDeleteCurrent = (name: string) => {
    deleteQuery(bucketName, entryName, name);
    const entries = Array.isArray(entryName) ? entryName : [entryName];
    onQueryDeleted?.(bucketName, entries, name);
  };

  const handleDeleteOther = (
    groupKey: string,
    groupBucket: string,
    groupEntries: string[],
    name: string,
  ) => {
    deleteQueryByKey(groupKey, name);
    onQueryDeleted?.(groupBucket, groupEntries, name);
  };

  const handleClear = () => {
    onClearQuery?.();
  };

  const totalQueries =
    currentQueries.length +
    otherGroups.reduce((sum, g) => sum + g.queries.length, 0);
  if (totalQueries === 0) return null;

  const renderOption = (option: {
    key: string;
    value: string;
    name: string;
    onDelete: () => void;
  }) => (
    <Select.Option key={option.key} value={option.value} label={option.name}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography.Text>{option.name}</Typography.Text>
        {editable && (
          <Popconfirm
            title={`Delete query "${option.name}"?`}
            onConfirm={(e) => {
              e?.stopPropagation();
              option.onDelete();
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
                data-testid={`delete-query-${option.name}`}
              />
            </Tooltip>
          </Popconfirm>
        )}
      </div>
    </Select.Option>
  );

  return (
    <Select<string>
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
      {currentQueries.map((q) =>
        renderOption({
          key: q.name,
          value: q.name,
          name: q.name,
          onDelete: () => handleDeleteCurrent(q.name),
        }),
      )}
      {otherGroups.map((group) => {
        const [groupQuery] = group.queries;
        const groupBucket = groupQuery?.bucketName ?? "";
        const groupEntries = groupQuery?.entries ?? [];
        return (
          <Select.OptGroup key={group.key} label={formatQueryKey(group.key)}>
            {group.queries.map((q) =>
              renderOption({
                key: `${group.key}::${q.name}`,
                value: `${group.key}::${q.name}`,
                name: q.name,
                onDelete: () =>
                  handleDeleteOther(
                    group.key,
                    groupBucket,
                    groupEntries,
                    q.name,
                  ),
              }),
            )}
          </Select.OptGroup>
        );
      })}
    </Select>
  );
}
