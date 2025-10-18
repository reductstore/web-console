import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(isoWeek);
dayjs.tz.setDefault("UTC");

export default dayjs;
export type { Dayjs } from "dayjs";
