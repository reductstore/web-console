import { CSSProperties } from "react";

export const ROW_LABEL_WIDTH = 70;
export const ROW_ICON_FONT_SIZE = 9;
export const ROW_INPUT_WIDTH = 195;
export const ROW_GAP = 8;
export const ROW_GROUP_WIDTH = ROW_INPUT_WIDTH * 2 + ROW_GAP;
export const OPERATOR_SELECT_WIDTH = ROW_LABEL_WIDTH;
export const ROW_VALUE_COLUMN_WIDTH =
  ROW_INPUT_WIDTH * 2 + OPERATOR_SELECT_WIDTH + ROW_GAP * 2;
export const WRAP_ROW_STYLE: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: ROW_GAP,
};
export const VALUE_INPUT_WIDTH = 100;
export const PROTOBUF_FIELD_ID_WIDTH = 90;
export const PROTOBUF_TYPE_WIDTH = 140;
// These "remaining space" widths fill out to the full value column
// (ROW_VALUE_COLUMN_WIDTH) rather than stopping at ROW_GROUP_WIDTH, so a
// row's last input always reaches the same right edge as every other row
// (e.g. the Where condition row, or the SQL/Format/Export action column).
export const PROTOBUF_COLUMN_WIDTH =
  ROW_VALUE_COLUMN_WIDTH -
  PROTOBUF_FIELD_ID_WIDTH -
  PROTOBUF_TYPE_WIDTH -
  ROW_GAP * 2;
export const EXPORT_DURATION_WIDTH =
  ROW_VALUE_COLUMN_WIDTH - VALUE_INPUT_WIDTH * 2 - ROW_GAP * 2;
export const PROTOBUF_MESSAGE_NAME_WIDTH = 160;
export const PROTOBUF_SCHEMA_WIDTH =
  ROW_VALUE_COLUMN_WIDTH - PROTOBUF_MESSAGE_NAME_WIDTH - ROW_GAP;
