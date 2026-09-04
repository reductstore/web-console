import { Button, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { KeyValueRow } from "../../Helpers/transformStepBuilder";
import { ROW_GAP, ROW_GROUP_WIDTH } from "./stepRowLayout";

interface RowListProps {
  rows: KeyValueRow[];
  keyPlaceholder: string;
  valuePlaceholder: string;
  onChange: (
    id: string,
    changes: Partial<Pick<KeyValueRow, "key" | "value">>,
  ) => void;
  onRemove: (id: string) => void;
  removeLabel: string;
  onRemoveSection: () => void;
  sectionRemoveLabel: string;
}

export default function RowList({
  rows,
  keyPlaceholder,
  valuePlaceholder,
  onChange,
  onRemove,
  removeLabel,
  onRemoveSection,
  sectionRemoveLabel,
}: RowListProps) {
  const onlyRow = rows.length === 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{ display: "flex", alignItems: "center", gap: ROW_GAP }}
        >
          <div
            style={{ display: "flex", gap: ROW_GAP, width: ROW_GROUP_WIDTH }}
          >
            <Input
              placeholder={keyPlaceholder}
              value={row.key}
              onChange={(e) => onChange(row.id, { key: e.target.value })}
              style={{ flex: 1, minWidth: 0 }}
            />
            <Input
              placeholder={valuePlaceholder}
              value={row.value}
              onChange={(e) => onChange(row.id, { value: e.target.value })}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
          <Button
            aria-label={onlyRow ? sectionRemoveLabel : removeLabel}
            type="text"
            icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
            onClick={() => (onlyRow ? onRemoveSection() : onRemove(row.id))}
          />
        </div>
      ))}
    </div>
  );
}
