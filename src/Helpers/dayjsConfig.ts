import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(isoWeek);
dayjs.extend(relativeTime);
dayjs.tz.setDefault("UTC");

export default dayjs;
export type { Dayjs } from "dayjs";
