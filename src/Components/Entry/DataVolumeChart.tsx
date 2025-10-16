import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  LogarithmicScale,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import "chartjs-adapter-dayjs-4";
import dayjs from "../../Helpers/dayjsConfig";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import {
  binRecords,
  roundToBuckets,
  type Point,
} from "../../Helpers/chartUtils";
import { ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import "./DataVolumeChart.css";

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  LogarithmicScale,
  Tooltip,
  Legend,
  zoomPlugin,
);

export interface DataVolumeChartProps {
  records: ReadableRecord[];
  setTimeRange: (
    start: bigint | undefined,
    end: bigint | undefined,
    isCustomRange?: boolean,
  ) => void;
  startMs?: number;
  endMs?: number;
  isLoading?: boolean;
}

const DataVolumeChart: React.FC<DataVolumeChartProps> = React.memo(
  ({ records, setTimeRange, startMs, endMs, isLoading }) => {
    const baselineUs = useRef<{ start?: bigint; end?: bigint } | null>(null);
    const updateBaseline = useRef(true);
    const [mountedOnce, setMountedOnce] = useState(false);
    const lastMaxY = useRef(1);

    const { points, bucketSizeMs } = useMemo(
      () => binRecords(records, startMs, endMs),
      [records, startMs, endMs],
    );

    useEffect(() => {
      if (records.length) setMountedOnce(true);
    }, [records]);

    useEffect(() => {
      if (isLoading || updateBaseline.current) {
        baselineUs.current = {
          start:
            startMs == null ? undefined : BigInt(Math.trunc(startMs * 1000)),
          end: endMs == null ? undefined : BigInt(Math.trunc(endMs * 1000)),
        };
      }
      updateBaseline.current = false;
    }, [startMs, endMs, isLoading]);

    const chartData: ChartData<"line", Point[], unknown> = useMemo(
      () => ({
        datasets: [
          {
            type: "line",
            data: points,

            borderColor: "#DB817B",
            pointBackgroundColor: "#DB817B",
            pointHoverBackgroundColor: "#DB817Bcc",
            pointBorderColor: "#ffffff",
            pointHoverBorderColor: "#ffffffcc",

            borderWidth: 1.5,
            pointRadius: 2.5,
            pointHoverRadius: 3,

            tension: 0.3,
          },
        ],
      }),
      [points],
    );

    const toUs = useCallback(
      (v?: number) =>
        v == null || Number.isNaN(v) ? undefined : BigInt(Math.trunc(v * 1000)),
      [],
    );

    const maxY = useMemo(() => {
      if (!records.length) return lastMaxY.current;
      const m = points.reduce((acc, p) => (p.y > acc ? p.y : acc), 0);
      if (m > 0) lastMaxY.current = m;
      return m || lastMaxY.current || 1;
    }, [points, records]);

    const enableZoom = useMemo(() => {
      return !isLoading && points.filter((p) => p.y > 0).length > 1;
    }, [isLoading, points]);

    const { min: roundedMinMs, max: roundedMaxMs } = useMemo(() => {
      const left = startMs ?? (points.length ? points[0].x : undefined);
      const right =
        endMs ?? (points.length ? points[points.length - 1].x : undefined);
      if (left == null || right == null)
        return { min: undefined as any, max: undefined as any };
      return roundToBuckets(left, right, bucketSizeMs);
    }, [startMs, endMs, points, bucketSizeMs]);

    const chartOptions: ChartOptions<"line"> = useMemo(
      () => ({
        responsive: true,
        resizeDelay: 300,
        maintainAspectRatio: false,
        parsing: false,
        normalized: true,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 300, easing: "easeOutQuart" },
        scales: {
          x: {
            type: "time",
            bounds: "ticks",
            grace: bucketSizeMs,
            min: roundedMinMs,
            max: roundedMaxMs,
            ticks: {
              maxRotation: 0,
              autoSkip: true,
            },
            time: {
              displayFormats: {
                millisecond: "HH:mm:ss.SSS",
                second: "HH:mm:ss",
                minute: "HH:mm",
                hour: "MMM D, HH:mm",
                day: "MMM D",
              },
              tooltipFormat: "YYYY-MM-DD HH:mm:ss",
            },
          },
          y: {
            beginAtZero: true,
            display: true,
            type: "linear",
            title: { display: true, text: "Number of Records" },
            ticks: {
              callback: (v) => {
                if (typeof v === "number" && !Number.isInteger(v)) return "";
                return typeof v === "number" ? `${v}` : "";
              },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const size = ctx.parsed.y as number | undefined;
                return typeof size !== "number" ? "" : ` ${size}`;
              },
              title: (items) => {
                if (!items.length) return "";
                const v = items[0].parsed.x as number | undefined;
                if (v == null || Number.isNaN(v)) return "";
                const start = dayjs(v);
                const end = start.add(bucketSizeMs, "millisecond");
                return `${start.format("YYYY-MM-DD HH:mm:ss")} - ${end.format("HH:mm:ss")}`;
              },
            },
          },
          zoom: {
            limits: { x: { minRange: bucketSizeMs * 2 } },
            zoom: {
              drag: {
                enabled: enableZoom,
                borderColor: "#999",
                borderWidth: 0.5,
              },
              mode: "x",
              onZoomComplete: ({ chart }) => {
                const scale = (chart.scales as any).x;
                const min = scale?.min as number | undefined;
                const max = scale?.max as number | undefined;
                if (min == null || max == null) return;
                const nextStartUs = toUs(min);
                const nextEndUs = toUs(max);
                const currStartUs = toUs(startMs);
                const currEndUs = toUs(endMs);
                if (nextStartUs === currStartUs && nextEndUs === currEndUs)
                  return;
                updateBaseline.current = false;
                requestAnimationFrame(() =>
                  setTimeRange(nextStartUs, nextEndUs, true),
                );
              },
            },
          },
        },
      }),
      [
        bucketSizeMs,
        endMs,
        setTimeRange,
        startMs,
        toUs,
        maxY,
        roundedMinMs,
        roundedMaxMs,
        isLoading,
        records,
        enableZoom,
      ],
    );

    const showReset = useMemo(() => {
      const b = baselineUs.current;
      const currStartUs = toUs(startMs);
      const currEndUs = toUs(endMs);
      if (b == null || isLoading) return false;
      return b?.start !== currStartUs || b?.end !== currEndUs;
    }, [startMs, endMs, toUs, isLoading]);

    const handleResetZoom = () => {
      const b = baselineUs.current;
      requestAnimationFrame(() => setTimeRange(b?.start, b?.end, true));
    };

    if (!records.length && !mountedOnce) return null;
    return (
      <div className="recordsChart">
        <Line data={chartData} options={chartOptions} />
        {showReset && (
          <Button
            icon={<ReloadOutlined />}
            size="small"
            shape="circle"
            onClick={handleResetZoom}
            className="resetZoomBtn"
            aria-label="Reset zoom to last range"
          />
        )}
      </div>
    );
  },
);

export default DataVolumeChart;
