import { Button, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { KeyValueRow } from "../../Helpers/transformStepBuilder";
import {
  ROW_INPUT_WIDTH,
  ROW_ICON_FONT_SIZE,
  WRAP_ROW_STYLE,
} from "./stepRowLayout";

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
        <div key={row.id} style={WRAP_ROW_STYLE}>
          <Input
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(e) => onChange(row.id, { key: e.target.value })}
            style={{ width: ROW_INPUT_WIDTH }}
          />
          <Input
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(e) => onChange(row.id, { value: e.target.value })}
            style={{ width: ROW_INPUT_WIDTH }}
          />
          <Button
            aria-label={onlyRow ? sectionRemoveLabel : removeLabel}
            type="text"
            icon={<CloseOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
            onClick={() => (onlyRow ? onRemoveSection() : onRemove(row.id))}
          />
        </div>
      ))}
    </div>
  );
}
