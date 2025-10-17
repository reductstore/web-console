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
import { ReloadOutlined } from "@ant-design/icons";
import { Button } from "antd";
import "./DataVolumeChart.css";
import { msToMicroseconds } from "../../Helpers/NumberUtils";

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
  start?: bigint;
  end?: bigint;
  isLoading?: boolean;
  showUnix?: boolean;
}

const DataVolumeChart: React.FC<DataVolumeChartProps> = React.memo(
  ({ records, setTimeRange, start, end, isLoading, showUnix }) => {
    const baselineUs = useRef<{ start?: bigint; end?: bigint } | null>(null);
    const updateBaseline = useRef(true);
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

    useEffect(() => {
      if (isLoading || updateBaseline.current) {
        baselineUs.current = { start, end };
      }
      updateBaseline.current = false;
    }, [start, end, isLoading]);

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

    const enableZoom = useMemo(
      () => !isLoading && points.filter((p) => p.y > 0).length > 1,
      [isLoading, points],
    );

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
                if (showUnix) return `${Math.trunc(v)}`;
                const startD = dayjs(v);
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
                updateBaseline.current = false;
                requestAnimationFrame(() => setTimeRange(nextstart, nextend));
              },
            },
          },
        },
      }),
      [
        bucketSize,
        end,
        setTimeRange,
        start,
        maxY,
        isLoading,
        records,
        enableZoom,
        showUnix,
      ],
    );

    const showReset = useMemo(() => {
      const b = baselineUs.current;
      if (b == null || isLoading) return false;
      return b?.start !== start || b?.end !== end;
    }, [start, end, isLoading]);

    const handleResetZoom = () => {
      const b = baselineUs.current;
      requestAnimationFrame(() => setTimeRange(b?.start, b?.end));
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
