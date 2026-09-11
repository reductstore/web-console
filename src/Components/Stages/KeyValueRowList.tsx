import { Button, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { KeyValueRow } from "../../Helpers/transformStepBuilder";
import { ROW_ICON_FONT_SIZE, ROW_GAP } from "./stageRowLayout";
import { GridRow } from "./StageSectionLayout";

interface RowListProps {
  label: string;
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

// Renders one GridRow per key/value pair (label shown only on the first)
// instead of a single GridRow wrapping a flex column, so each row's remove
// button lands in the shared actions column - aligned with every other
// section's trailing icon (Filter, Format, Export, SQL...) instead of
// trailing right after the two inputs.
export default function RowList({
  label,
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
    <>
      {rows.map((row, index) => (
        <GridRow
          key={row.id}
          label={index === 0 ? label : ""}
          actions={
            <Button
              aria-label={onlyRow ? sectionRemoveLabel : removeLabel}
              type="text"
              icon={<CloseOutlined style={{ fontSize: ROW_ICON_FONT_SIZE }} />}
              onClick={() => (onlyRow ? onRemoveSection() : onRemove(row.id))}
            />
          }
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ROW_GAP,
              width: "100%",
            }}
          >
            {/* flex: 1 on both inputs so they proportionally share the full
                row width instead of stopping short at a fixed size - the
                row still ends flush with every other row (e.g. Where). */}
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
        </GridRow>
      ))}
    </>
  );
}
