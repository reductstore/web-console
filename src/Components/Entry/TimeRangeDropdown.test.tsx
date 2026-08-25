import { render, screen, fireEvent, act } from "@testing-library/react";
import TimeRangeDropdown from "./TimeRangeDropdown";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import dayjs from "dayjs";
import { Grid } from "antd";
import { getTimeRangeFromKey, RANGE_MAP } from "../../Helpers/timeRangeUtils";

describe("TimeRangeDropdown", () => {
  beforeEach(() => {
    mockJSDOM();
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockOnSelectRange = vi.fn();

  const openMenuAndClick = async (label: string) => {
    await act(async () => {
      fireEvent.click(
        screen
          .getAllByRole("button")
          .find((button) => !button.hasAttribute("aria-label"))!,
      );
    });
    await act(async () => {
      fireEvent.click(screen.getByText(label));
    });
  };

  it("renders the dropdown button", () => {
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    expect(
      screen.getByRole("button", { name: /custom range/i }).textContent,
    ).toContain("Custom range");
  });

  it("renders Last 1 hour as the configured initial range", () => {
    render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        initialRangeKey="last1"
      />,
    );

    expect(
      screen.getByRole("button", { name: /last 1 hour/i }).textContent,
    ).toContain("Last 1 hour");
  });

  it.each([
    ["Last 5 minutes", 5n],
    ["Last 15 minutes", 15n],
    ["Last 30 minutes", 30n],
  ])("selects %s with its exact duration", async (label, minutes) => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);

    await openMenuAndClick(label);

    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(end - start).toBe(minutes * 60n * 1_000_000n);
  });

  it("shows presets in map order and applies the mobile scroll hook", async () => {
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);

    await act(async () => {
      fireEvent.click(
        screen
          .getAllByRole("button")
          .find((button) => !button.hasAttribute("aria-label"))!,
      );
    });

    const menu = document.querySelector(".timeRangePresetMenu");
    expect(menu).not.toBeNull();
    const labels = Array.from(
      menu!.querySelectorAll(".ant-dropdown-menu-title-content"),
    ).map((item) => item.textContent);
    expect(labels).toEqual(
      Object.entries(RANGE_MAP)
        .filter(([key]) => key !== "custom")
        .map(([, label]) => label),
    );
  });

  it("applies the desktop picker scroll hook", async () => {
    vi.spyOn(Grid, "useBreakpoint").mockReturnValue({ md: true });
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);

    await act(async () => {
      fireEvent.mouseDown(
        screen
          .getAllByRole("button")
          .find((button) => !button.hasAttribute("aria-label"))!,
      );
    });

    expect(document.querySelector(".timeRangePickerPopup")).not.toBeNull();
  });

  it("triggers onSelectRange for 'Last 1 hour'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last 1 hour");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 1 hour in microseconds
    expect(end - start).toEqual(1n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 6 hours'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last 6 hours");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 6 hours in microseconds
    expect(end - start).toEqual(6n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 24 hours'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last 24 hours");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 24 hours in microseconds
    expect(end - start).toEqual(24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 7 days'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last 7 days");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);

    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 7 days in microseconds with a tolerance of 1 hour to account for daylight saving time changes
    expect(end - start).toBeGreaterThanOrEqual(
      7n * 24n * 60n * 60n * 1_000_000n - 1n * 60n * 60n * 1_000_000n,
    );
    expect(end - start).toBeLessThanOrEqual(
      7n * 24n * 60n * 60n * 1_000_000n + 1n * 60n * 60n * 1_000_000n,
    );
  });

  it("triggers onSelectRange for 'Last 30 days'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last 30 days");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 30 days in microseconds with a tolerance of 1 hour to account for daylight saving time changes
    expect(end - start).toBeGreaterThanOrEqual(
      30n * 24n * 60n * 60n * 1_000_000n - 1n * 60n * 60n * 1_000_000n,
    );
    expect(end - start).toBeLessThanOrEqual(
      30n * 24n * 60n * 60n * 1_000_000n + 1n * 60n * 60n * 1_000_000n,
    );
  });

  it("triggers onSelectRange for 'Today'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Today");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);

    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be less than or equal to 1 day in microseconds
    expect(end - start).toBeLessThanOrEqual(24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Yesterday'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Yesterday");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Equal to 1 day (minus 1 millisecond until 23:59:59,999)
    expect(end - start).toEqual(24n * 60n * 60n * 1_000_000n - 1_000n);
  });

  it("triggers onSelectRange for 'This week'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("This week");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // accounting for daylight saving time changes
    const rangeInDays = Number(end - start) / (24 * 60 * 60 * 1_000_000);
    expect(rangeInDays).toBeGreaterThan(6.5);
    expect(rangeInDays).toBeLessThan(7.5);
  });

  it("triggers onSelectRange for 'Last week'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last week");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be approximately 7 days, accounting for daylight saving time changes
    const rangeInDays = Number(end - start) / (24 * 60 * 60 * 1_000_000);
    expect(rangeInDays).toBeGreaterThan(6.5);
    expect(rangeInDays).toBeLessThan(7.5);
  });

  it("triggers onSelectRange for 'This month'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("This month");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");

    const rangeInDays = Number(end - start) / (24 * 60 * 60 * 1_000_000);
    expect(rangeInDays).toBeGreaterThan(27);
    expect(rangeInDays).toBeLessThan(32);
  });

  it("triggers onSelectRange for 'Last month'", async () => {
    mockOnSelectRange.mockClear();
    render(<TimeRangeDropdown onSelectRange={mockOnSelectRange} />);
    await openMenuAndClick("Last month");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be less than or equal to 31 days in microseconds
    expect(end - start).toBeLessThanOrEqual(31n * 24n * 60n * 60n * 1_000_000n);
  });

  it("automatically detects range key from currentRange prop", () => {
    const last7Range = getTimeRangeFromKey("last7");
    render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={last7Range}
      />,
    );
    expect(
      screen.getByRole("button", { name: /last 7 days/i }).textContent,
    ).toContain("Last 7 days");
  });

  it("detects a short preset label from currentRange", () => {
    const last15Range = getTimeRangeFromKey("last15m");
    render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={last15Range}
      />,
    );

    expect(
      screen.getByRole("button", { name: /last 15 minutes/i }).textContent,
    ).toContain("Last 15 minutes");
  });

  it("displays 'Custom range' for unmatched currentRange", () => {
    const customRange = {
      start: BigInt(dayjs("2023-01-01").valueOf() * 1000),
      end: BigInt(dayjs("2023-01-02").valueOf() * 1000),
    };
    render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={customRange}
      />,
    );
    expect(
      screen.getByRole("button", { name: /custom range/i }).textContent,
    ).toContain("Custom range");
  });

  it("shifts a range by its exact duration in both directions", () => {
    const onShiftRange = vi.fn();
    const range = { start: 1_000n, end: 3_500n };
    const { rerender } = render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        onShiftRange={onShiftRange}
        currentRange={range}
      />,
    );

    const controls = screen.getByRole("group", {
      name: "Time range shift controls",
    });
    expect(controls.children).toHaveLength(3);

    fireEvent.click(
      screen.getByRole("button", { name: "Previous time range" }),
    );
    expect(onShiftRange).toHaveBeenLastCalledWith(-1_500n, 1_000n);

    rerender(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        onShiftRange={onShiftRange}
        currentRange={{ start: -1_500n, end: 1_000n }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next time range" }));
    expect(onShiftRange).toHaveBeenLastCalledWith(1_000n, 3_500n);
  });

  it("disables shifts for undefined or invalid ranges", () => {
    const { rerender } = render(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    const expectDisabled = () => {
      expect(
        screen.getByRole("button", { name: "Previous time range" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Next time range" }),
      ).toBeDisabled();
    };

    expectDisabled();
    rerender(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={{ start: 1n, end: 1n }}
      />,
    );
    expectDisabled();
    rerender(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={{ start: 2n, end: 1n }}
      />,
    );
    expectDisabled();
  });

  it("displays a shifted relative range as custom", () => {
    const relativeRange = getTimeRangeFromKey("last1");
    const duration = relativeRange.end - relativeRange.start;
    const { rerender } = render(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={relativeRange}
      />,
    );

    rerender(
      <TimeRangeDropdown
        onSelectRange={mockOnSelectRange}
        currentRange={{
          start: relativeRange.start - duration,
          end: relativeRange.end - duration,
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: /custom range/i }).textContent,
    ).toContain("Custom range");
  });
});
