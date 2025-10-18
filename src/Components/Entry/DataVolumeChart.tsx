import React, { useMemo, useRef, useEffect, useState } from "react";
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
import { binRecords, type Point } from "../../Helpers/chartUtils";
import "./DataVolumeChart.css";
import { msToMicroseconds } from "../../Helpers/NumberUtils";
import { Typography } from "antd";

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
  setTimeRange: (start: bigint | undefined, end: bigint | undefined) => void;
  isLoading?: boolean;
  showUnix?: boolean;
  fetchRecords?: () => void;
  interval?: string | null;
}

const DataVolumeChart: React.FC<DataVolumeChartProps> = React.memo(
  ({ records, setTimeRange, isLoading, showUnix, interval }) => {
    const start = records?.length ? records[0].time : undefined;
    const end = records?.length ? records[records.length - 1].time : undefined;

    const [mountedOnce, setMountedOnce] = useState(false);
    const lastMaxY = useRef(1);

    const { points, bucketSize } = useMemo(() => {
      const convert = showUnix
        ? (us: bigint) => Number(us)
        : (us: bigint) => Number(us / 1000n);
      return binRecords(records, start, end, convert);
    }, [records, start, end, showUnix]);

    useEffect(() => {
      if (records.length) setMountedOnce(true);
    }, [records]);

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

    const maxY = useMemo(() => {
      if (!records.length) return lastMaxY.current;
      const m = points.reduce((acc, p) => (p.y > acc ? p.y : acc), 0);
      if (m > 0) lastMaxY.current = m;
      return m || lastMaxY.current || 1;
    }, [points, records]);

    const enableZoom = useMemo(() => !isLoading, [isLoading, points]);

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
          x: showUnix
            ? {
                type: "linear",
                bounds: "ticks",
                ticks: {
                  maxRotation: 0,
                  autoSkip: true,
                  callback: (v) => `${Math.trunc(v as number)}`,
                },
              }
            : {
                type: "time",
                bounds: "ticks",
                ticks: { maxRotation: 0, autoSkip: true },
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
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const size = ctx.parsed.y as number | undefined;
                return typeof size !== "number"
                  ? ""
                  : size > 1
                    ? ` ${size} records`
                    : ` ${size} record`;
              },
              title: (items) => {
                if (!items.length) return "";
                const v = items[0].parsed.x as number | undefined;
                if (v == null || Number.isNaN(v)) return "";
                if (showUnix) return `${Math.trunc(v)}`;
                const startD = dayjs(v).subtract(
                  Number(bucketSize / 2000n),
                  "millisecond",
                );
                const endD = startD.add(
                  Number(bucketSize / 1000n),
                  "millisecond",
                );
                return `${startD.format("YYYY-MM-DD HH:mm:ss")} - ${endD.format("HH:mm:ss")}`;
              },
            },
          },
          zoom: {
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
                const toUs = (x: number) =>
                  showUnix ? BigInt(Math.trunc(x)) : msToMicroseconds(x);
                const nextstart = toUs(min);
                const nextend = toUs(max);
                if (nextstart === start && nextend === end) return;
                requestAnimationFrame(() => setTimeRange(nextstart, nextend));
              },
            },
          },
        },
      }),
      [
        bucketSize,
        setTimeRange,
        start,
        end,
        maxY,
        isLoading,
        records,
        enableZoom,
        showUnix,
      ],
    );

    if (!records.length && !mountedOnce) return null;
    return (
      <div className="recordsChart">
        {interval && (
          <Typography.Text code className="intervalLabel">
            Interval: {interval}
          </Typography.Text>
        )}
        <Line data={chartData} options={chartOptions} />
      </div>
    );
  },
);

export default DataVolumeChart;
