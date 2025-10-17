import React from "react";
import { mount } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import DataVolumeChart from "./DataVolumeChart";
import { ReadableRecord } from "reduct-js/lib/cjs/Record";
import { ReloadOutlined } from "@ant-design/icons";

jest.mock("react-chartjs-2", () => ({
  Line: ({ data, options, ...props }: any) => (
    <div
      data-testid="chart"
      data-chart-data={JSON.stringify(data)}
      data-chart-options={JSON.stringify(options)}
      {...props}
    />
  ),
}));

jest.mock("chart.js", () => ({
  Chart: {
    register: jest.fn(),
  },
  LineController: jest.fn(),
  LineElement: jest.fn(),
  PointElement: jest.fn(),
  LinearScale: jest.fn(),
  TimeScale: jest.fn(),
  LogarithmicScale: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock("chartjs-plugin-zoom", () => ({}));
jest.mock("chartjs-adapter-dayjs-4", () => ({}));

jest.mock("prettier-bytes", () => (bytes: number) => `${bytes} bytes`);

describe("DataVolumeChart", () => {
  beforeEach(() => {
    mockJSDOM();
    jest.clearAllMocks();
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });
  });

  const mockSetTimeRange = jest.fn();

  const createMockRecord = (timeUs: bigint, size: bigint): ReadableRecord =>
    ({
      time: timeUs,
      size,
      contentType: "application/octet-stream",
      read: jest.fn(),
      readAsJson: jest.fn(),
      readAsString: jest.fn(),
    }) as unknown as ReadableRecord;

  const defaultProps = {
    records: [],
    setTimeRange: mockSetTimeRange,
    isLoading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render nothing when no records and not mounted once", () => {
      const wrapper = mount(<DataVolumeChart {...defaultProps} />);
      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(0);
    });

    it("should render chart when records are provided", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );
      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(1);
    });

    it("should render chart container with correct class", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );
      expect(wrapper.find(".recordsChart")).toHaveLength(1);
    });

    it("should render chart even with empty records after being mounted once", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      wrapper.setProps({ records: [] });
      wrapper.update();

      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(1);
    });
  });

  describe("Chart Data", () => {
    it("should generate correct chart data structure", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const chartData = JSON.parse(chart.prop("data-chart-data"));

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

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const options = JSON.parse(chart.prop("data-chart-options"));

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

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={true}
        />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const options = JSON.parse(chart.prop("data-chart-options"));

      expect(options.plugins.zoom.zoom.drag.enabled).toBe(false);
    });

    it("should enable zoom drag when not loading and has multiple data points", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={false}
        />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const options = JSON.parse(chart.prop("data-chart-options"));

      expect(options.plugins.zoom.zoom.drag.enabled).toBe(true);
    });

    it("should disable zoom drag when there is only one data point", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={false}
        />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const options = JSON.parse(chart.prop("data-chart-options"));

      expect(options.plugins.zoom.zoom.drag.enabled).toBe(false);
    });
  });

  describe("Time Range", () => {
    it("should handle undefined startMs and endMs", () => {
      const records = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const chart = wrapper.find('[data-testid="chart"]');
      const options = JSON.parse(chart.prop("data-chart-options"));

      expect(options.scales.x).toBeDefined();
    });
  });

  describe("Reset Zoom Button", () => {
    it("should not show reset button when not zoomed", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      expect(wrapper.find(ReloadOutlined)).toHaveLength(0);
    });

    it("should not show reset button when loading", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          isLoading={true}
        />,
      );

      expect(wrapper.find(ReloadOutlined)).toHaveLength(0);
    });

    it("should show reset button when time range changes", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          start={1000n}
          end={2000n}
          isLoading={true}
        />,
      );

      wrapper.setProps({ start: 1200n, end: 1800n, isLoading: false });
      wrapper.update();

      expect(wrapper.find(ReloadOutlined)).toHaveLength(1);
    });

    it("should call setTimeRange when reset button is clicked", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          start={1000n}
          end={2000n}
        />,
      );

      wrapper.setProps({ start: 1200n, end: 1800n });
      wrapper.update();

      const resetButton = wrapper.find(ReloadOutlined).closest("button");
      resetButton.simulate("click");

      expect(mockSetTimeRange).toHaveBeenCalled();
    });

    it("should have proper accessibility attributes on reset button", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart
          {...defaultProps}
          records={records}
          start={1000n}
          end={2000n}
        />,
      );

      wrapper.setProps({ start: 1200n, end: 1800n });
      wrapper.update();

      const resetButton = wrapper.find(".resetZoomBtn").first();
      expect(resetButton.prop("aria-label")).toBe("Reset zoom to last range");
    });
  });

  describe("Props Changes", () => {
    it("should update chart when records change", () => {
      const initialRecords = [createMockRecord(1000000n, 1024n)];
      const newRecords = [
        createMockRecord(1000000n, 1024n),
        createMockRecord(2000000n, 2048n),
      ];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={initialRecords} />,
      );

      const initialChart = wrapper.find('[data-testid="chart"]');
      const initialData = JSON.parse(initialChart.prop("data-chart-data"));

      wrapper.setProps({ records: newRecords });
      wrapper.update();

      const updatedChart = wrapper.find('[data-testid="chart"]');
      const updatedData = JSON.parse(updatedChart.prop("data-chart-data"));

      expect(updatedData.datasets[0].data.length).not.toBe(
        initialData.datasets[0].data.length,
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty records array gracefully", () => {
      const wrapper = mount(<DataVolumeChart {...defaultProps} records={[]} />);

      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(0);
    });

    it("should handle single record", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(1);

      const chart = wrapper.find('[data-testid="chart"]');
      const chartData = JSON.parse(chart.prop("data-chart-data"));

      expect(chartData.datasets[0].data).toHaveLength(1);
    });

    it("should handle very large time values", () => {
      const records = [
        createMockRecord(BigInt(Date.now()) * 1000n, 1024n),
        createMockRecord(BigInt(Date.now() + 1000) * 1000n, 2048n),
      ];

      expect(() => {
        mount(<DataVolumeChart {...defaultProps} records={records} />);
      }).not.toThrow();
    });
  });

  describe("Memoization", () => {
    it("should be memoized with React.memo", () => {
      const records = [createMockRecord(1000000n, 1024n)];

      const wrapper = mount(
        <DataVolumeChart {...defaultProps} records={records} />,
      );

      const initialRenderCount = wrapper.find('[data-testid="chart"]').length;

      wrapper.setProps({ ...defaultProps, records });
      wrapper.update();

      expect(wrapper.find('[data-testid="chart"]')).toHaveLength(
        initialRenderCount,
      );
    });
  });
});
