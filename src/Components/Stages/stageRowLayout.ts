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
// Width of the small icon-only remove/close button trailing a row - shared
// so every row that reserves space for one (or its own kind of row) sizes
// its inputs consistently instead of guessing a magic number per file.
export const ROW_ICON_BUTTON_WIDTH = 32;
export const PROTOBUF_FIELD_ID_WIDTH = 90;
export const PROTOBUF_TYPE_WIDTH = 140;
// These "remaining space" widths fill out to the full value column
// (ROW_VALUE_COLUMN_WIDTH) rather than stopping at ROW_GROUP_WIDTH, so a
// row's last input always reaches the same right edge as every other row
// (e.g. the Where condition row, or the SQL/Format/Export action column).
// Unlike the other "remaining space" rows, each protobuf field row also
// trails its own remove button (it isn't hoisted into a shared GridRow
// actions column like KeyValueRowList's rows are), so that button's width
// and its extra gap must be budgeted for too - otherwise the row's total
// content is wider than the column and the button wraps onto its own line.
export const PROTOBUF_COLUMN_WIDTH =
  ROW_VALUE_COLUMN_WIDTH -
  PROTOBUF_FIELD_ID_WIDTH -
  PROTOBUF_TYPE_WIDTH -
  ROW_ICON_BUTTON_WIDTH -
  ROW_GAP * 3;
export const EXPORT_DURATION_WIDTH =
  ROW_VALUE_COLUMN_WIDTH - VALUE_INPUT_WIDTH * 2 - ROW_GAP * 2;
export const PROTOBUF_MESSAGE_NAME_WIDTH = 160;
export const PROTOBUF_SCHEMA_WIDTH =
  ROW_VALUE_COLUMN_WIDTH - PROTOBUF_MESSAGE_NAME_WIDTH - ROW_GAP;
// ROS export shows three plain text inputs (format/duration/size) that are
// all equally important - unlike Select's export row (a narrow format
// dropdown + narrow row count, leaving the remainder for duration), so the
// value column is split into thirds instead of reusing ROW_INPUT_WIDTH
// (sized for two-input rows), which pushed the third input onto its own
// line instead of keeping the row on one line.
export const ROS_EXPORT_FIELD_WIDTH =
  (ROW_VALUE_COLUMN_WIDTH - ROW_GAP * 2) / 3;
