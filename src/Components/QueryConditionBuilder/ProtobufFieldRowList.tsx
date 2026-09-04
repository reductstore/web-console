import { Button, InputNumber, Select, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { ProtobufFieldRow } from "../../Helpers/transformStepBuilder";
import {
  ROW_GAP,
  PROTOBUF_COLUMN_WIDTH,
  PROTOBUF_FIELD_ID_WIDTH,
  PROTOBUF_TYPE_WIDTH,
} from "./stepRowLayout";

const PROTOBUF_FIELD_TYPES = [
  "string",
  "bytes",
  "double",
  "float",
  "fixed64",
  "sfixed64",
  "fixed32",
  "sfixed32",
  "sint32",
  "sint64",
  "uint64",
  "uint32",
  "int64",
  "int32",
  "bool",
  "enum",
];

interface ProtobufFieldRowListProps {
  rows: ProtobufFieldRow[];
  onChange: (
    id: string,
    changes: Partial<
      Pick<ProtobufFieldRow, "column" | "fieldId" | "fieldType">
    >,
  ) => void;
  onRemove: (id: string) => void;
}

export default function ProtobufFieldRowList({
  rows,
  onChange,
  onRemove,
}: ProtobufFieldRowListProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{ display: "flex", alignItems: "center", gap: ROW_GAP }}
        >
          <Input
            placeholder="column (e.g. temperature)"
            value={row.column}
            onChange={(e) => onChange(row.id, { column: e.target.value })}
            style={{ width: PROTOBUF_COLUMN_WIDTH }}
          />
          <InputNumber
            aria-label="Field id"
            placeholder="id"
            value={row.fieldId === "" ? undefined : Number(row.fieldId)}
            onChange={(value) =>
              onChange(row.id, {
                fieldId: value === null ? "" : String(value),
              })
            }
            style={{ width: PROTOBUF_FIELD_ID_WIDTH }}
          />
          <Select
            aria-label="Field type"
            placeholder="type"
            value={row.fieldType || undefined}
            options={PROTOBUF_FIELD_TYPES.map((t) => ({ value: t, label: t }))}
            onChange={(value) => onChange(row.id, { fieldType: value })}
            style={{ width: PROTOBUF_TYPE_WIDTH }}
          />
          <Button
            aria-label="Remove protobuf field"
            type="text"
            icon={<CloseOutlined style={{ transform: "scale(0.65)" }} />}
            onClick={() => onRemove(row.id)}
          />
        </div>
      ))}
    </div>
  );
}
