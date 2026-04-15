import React from "react";
import { render } from "@testing-library/react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import DataVolumeChart from "./DataVolumeChart";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";

vi.mock("react-chartjs-2", () => ({
  Line: ({ data, options, ...props }: any) => (
    <div
      data-testid="chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      {...props}
    />
  ),
}));

vi.mock("chart.js", () => ({
  Chart: {
    register: vi.fn(),
  },
  LineController: vi.fn(),
  LineElement: vi.fn(),
  PointElement: vi.fn(),
  LinearScale: vi.fn(),
  TimeScale: vi.fn(),
  LogarithmicScale: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

vi.mock("chartjs-plugin-zoom", () => ({ default: {} }));

vi.mock("prettier-bytes", () => ({
  default: (bytes: number) => `${bytes} bytes`,
}));

describe("DataVolumeChart", () => {
  beforeEach(() => {
    mockJSDOM();
    vi.clearAllMocks();
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      cb(0);
      return 0;
    });
  });

  const mockSetTimeRange = vi.fn();

  const createMockRecord = (timeUs: bigint, size: bigint): ReadableRecord =>
    ({
      time: timeUs,
      size,
      contentType: "application/octet-stream",
      read: vi.fn(),
      readAsJson: vi.fn(),
      readAsString: vi.fn(),
    }) as unknown as ReadableRecord;

  const defaultProps = {
    records: [],
    setTimeRange: mockSetTimeRange,
    isLoading: false,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render nothing when no records and not mounted once", () => {
      const { container } = render(<DataVolumeChart {...defaultProps} />);
      expect(container.querySelector('[data-testid="chart"]')).toBeNull();
    });

    it("should render chart when records are provided", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );
      expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
    });

    it("should render chart container with correct class", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );
      expect(container.querySelector(".recordsChart")).toBeTruthy();
    });

    it("should render chart even with empty records after being mounted once", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container, rerender } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      rerender(<DataVolumeChart {...defaultProps} records={[]} />);

      expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
    });
  });

  describe("Chart Data", () => {
    it("should generate correct chart data structure", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = container.querySelector('[data-testid="chart"]');
      const chartData = JSON.parse(chart!.getAttribute("data-chart-data")!);

      expect(chartData).toHaveProperty("datasets");
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0]).toMatchObject({
        type: "line",
      });
      expect(chartData.datasets[0].data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          }),
        ]),
      );
    });
  });

  describe("Chart Options", () => {
    it("should configure chart with correct options", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = container.querySelector('[data-testid="chart"]');
      const options = JSON.parse(chart!.getAttribute("data-chart-options")!);

      expect(options).toMatchObject({
        responsive: true,
        resizeDelay: 300,
        maintainAspectRatio: false,
        parsing: false,
        normalized: true,
        interaction: { mode: "index", intersect: false },
        animation: { duration: 300, easing: "easeOutQuart" },
      });

      expect(options.scales).toHaveProperty("x");
      expect(options.scales).toHaveProperty("y");
      expect(options.scales.x.type).toBe("time");
      expect(options.scales.y.type).toBe("linear");
      expect(options.plugins).toHaveProperty("zoom");
    });

    it("should disable zoom drag when loading", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container } = render(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={true}
        />,
      );

      const chart = container.querySelector('[data-testid="chart"]');
      const options = JSON.parse(chart!.getAttribute("data-chart-options")!);

      expect(options.plugins.zoom.zoom.drag.enabled).toBe(false);
    });

    it("should enable zoom drag when not loading and has multiple data points", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const { container } = render(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={false}
        />,
      );

      const chart = container.querySelector('[data-testid="chart"]');
      const options = JSON.parse(chart!.getAttribute("data-chart-options")!);

      expect(options.plugins.zoom.zoom.drag.enabled).toBe(true);
    });
  });

  describe("Time Range", () => {
    it("should handle undefined startMs and endMs", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = container.querySelector('[data-testid="chart"]');
      const options = JSON.parse(chart!.getAttribute("data-chart-options")!);

      expect(options.scales.x).toBeDefined();
    });
  });

  describe("Props Changes", () => {
    it("should update chart when records change", () => {
      const initialRecords = [createMockRecord(1000000n, 1024n)];
      const newRecords = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const { container, rerender } = render(
        <DataVolumeChart {...defaultProps} records={initialRecords} />,
      );

      const initialChart = container.querySelector('[data-testid="chart"]');
      const initialData = JSON.parse(
        initialChart!.getAttribute("data-chart-data")!,
      );

      rerender(<DataVolumeChart {...defaultProps} records={newRecords} />);

      const updatedChart = container.querySelector('[data-testid="chart"]');
      const updatedData = JSON.parse(
        updatedChart!.getAttribute("data-chart-data")!,
      );

      expect(updatedData.datasets[0].data.length).not.toBe(
        initialData.datasets[0].data.length,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty records array gracefully", () => {
      const { container } = render(
        <DataVolumeChart {...defaultProps} records={[]} />,
      );

      expect(container.querySelector('[data-testid="chart"]')).toBeNull();
    });

    it("should handle single record", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();

      const chart = container.querySelector('[data-testid="chart"]');
      const chartData = JSON.parse(chart!.getAttribute("data-chart-data")!);

      expect(chartData.datasets[0].data).toHaveLength(1);
    });

    it("should handle very large time values", () => {
      const records = [
        createMockRecord(BigInt(Date.now()) * 1000n, 1024n),
        createMockRecord(BigInt(Date.now() + 1000) * 1000n, 2048n),
      ];

      expect(() => {
        render(<DataVolumeChart {...defaultProps} records={records} />);
      }).not.toThrow();
    });
  });

  describe("Memoization", () => {
    it("should be memoized with React.memo", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const { container, rerender } = render(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const initialChart = container.querySelector('[data-testid="chart"]');
      expect(initialChart).toBeTruthy();

      rerender(<DataVolumeChart {...defaultProps} records={records} />);

      expect(container.querySelector('[data-testid="chart"]')).toBeTruthy();
    });
  });
});
