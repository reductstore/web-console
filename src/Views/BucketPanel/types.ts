import { ReadableRecord } from "reduct-js/lib/cjs/Record";

export type IndexedReadableRecord = {
  record: ReadableRecord;
  tableIndex: number;
};
