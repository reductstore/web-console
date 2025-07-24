import { mount } from "enzyme";
import TimeRangeDropdown from "./TimeRangeDropdown";
import { Button } from "antd";
import { mockJSDOM } from "../../Helpers/TestHelpers";

describe("TimeRangeDropdown", () => {
  beforeEach(() => mockJSDOM());

  const mockOnSelectRange = jest.fn();

  const findMenuItem = (wrapper: ReturnType<typeof mount>, label: string) => {
    return wrapper
      .find("li[role='menuitem']")
      .filterWhere((node) => node.text().includes(label));
  };

  it("renders the dropdown button", () => {
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    expect(wrapper.find(Button).text()).toContain("Select time range");
  });

  it("triggers onSelectRange for 'Last 1 hour'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last 1 hour");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 1 hour in microseconds
    expect(end - start).toEqual(1n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 6 hours'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last 6 hours");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 6 hours in microseconds
    expect(end - start).toEqual(6n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 24 hours'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last 24 hours");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 24 hours in microseconds
    expect(end - start).toEqual(24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 7 days'", () => {
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last 7 days");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);

    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 7 days in microseconds
    expect(end - start).toEqual(7n * 24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Last 30 days'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last 30 days");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // 30 days in microseconds
    expect(end - start).toEqual(30n * 24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Today'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Today");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);

    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be less than or equal to 1 day in microseconds
    expect(end - start).toBeLessThanOrEqual(24n * 60n * 60n * 1_000_000n);
  });

  it("triggers onSelectRange for 'Yesterday'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Yesterday");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Equal to 1 day (minus 1 millisecond until 23:59:59,999)
    expect(end - start).toEqual(24n * 60n * 60n * 1_000_000n - 1_000n);
  });

  it("triggers onSelectRange for 'This week'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "This week");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be equal to 7 days in microseconds (minus 1 millisecond until 23:59:59,999)
    expect(end - start).toEqual(7n * 24n * 60n * 60n * 1_000_000n - 1_000n);
  });

  it("triggers onSelectRange for 'Last week'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last week");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be equal to 7 days in microseconds (minus 1 millisecond until 23:59:59,999)
    expect(end - start).toEqual(7n * 24n * 60n * 60n * 1_000_000n - 1_000n);
  });

  it("triggers onSelectRange for 'This month'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "This month");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be equal to 31 days in microseconds (minus 1 millisecond until 23:59:59,999)
    expect(end - start).toEqual(31n * 24n * 60n * 60n * 1_000_000n - 1_000n);
  });

  it("triggers onSelectRange for 'Last month'", () => {
    mockOnSelectRange.mockClear();
    const wrapper = mount(
      <TimeRangeDropdown onSelectRange={mockOnSelectRange} />,
    );
    wrapper.find(Button).simulate("click");
    const menuItem = findMenuItem(wrapper, "Last month");
    menuItem.simulate("click");
    expect(mockOnSelectRange).toHaveBeenCalledTimes(1);
    const [start, end] = mockOnSelectRange.mock.calls[0] || [];
    expect(typeof start).toBe("bigint");
    expect(typeof end).toBe("bigint");
    // Should be less than or equal to 31 days in microseconds
    expect(end - start).toBeLessThanOrEqual(31n * 24n * 60n * 60n * 1_000_000n);
  });
});
