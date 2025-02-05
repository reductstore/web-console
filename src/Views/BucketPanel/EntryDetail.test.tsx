import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client, EntryInfo } from "reduct-js";
import EntryDetail from "./EntryDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";
import { act } from "react-dom/test-utils";
import { DownloadOutlined } from "@ant-design/icons";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    bucketName: "testBucket",
    entryName: "testEntry",
  }),
}));

describe("EntryDetail", () => {
  const client = new Client("");
  const bucket = {} as Bucket;
  let wrapper: ReactWrapper;
  const mockRecords = [
    {
      time: 1000n,
      size: 1024n,
      contentType: "application/json",
      labels: { key: "value" },
    },
    {
      time: 2000n,
      size: 2048n,
      contentType: "text/plain",
      labels: { type: "test" },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockJSDOM();

    client.getBucket = jest.fn().mockResolvedValue(bucket);

    bucket.query = jest.fn().mockImplementation(() => ({
      async *[Symbol.asyncIterator]() {
        for (const record of mockRecords) {
          yield record;
        }
      },
    }));

    bucket.getEntryList = jest.fn().mockResolvedValue([
      {
        name: "testEntry",
        oldestRecord: 0n,
        latestRecord: 10000n,
      } as EntryInfo,
    ]);

    wrapper = mount(
      <MemoryRouter>
        <EntryDetail client={client} />
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe("UI Elements", () => {
    beforeEach(async () => {
      await act(async () => {
        jest.runOnlyPendingTimers();
        await waitUntil(
          () => wrapper.update().find(".ant-checkbox").length > 0,
        );
      });
    });

    it("should show the Unix timestamp toggle", () => {
      const toggle = wrapper.find(".ant-checkbox-wrapper");
      expect(toggle.exists()).toBe(true);
      expect(toggle.text()).toContain("Unix Timestamp");
    });

    it("should show the date picker by default", () => {
      const datePicker = wrapper.find(".ant-picker-range");
      expect(datePicker.exists()).toBe(true);
      expect(datePicker.props().className).toContain("ant-picker-range");
    });

    it("should show the fetch records button", () => {
      const fetchButton = wrapper.find("button");
      expect(fetchButton.exists()).toBe(true);
      expect(fetchButton.at(0).text()).toBe("Fetch Records");
    });

    it("should show the records limit input", () => {
      const limitInput = wrapper.find(".ant-input-number");
      expect(limitInput.exists()).toBe(true);
      expect(limitInput.props().className).toContain("ant-input-number");
    });
  });

  it("should fetch and display records", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    const rows = wrapper.find(".ant-table-row");
    expect(rows.length).toBe(2);

    expect(rows.at(0).text()).toContain("1970-01-01T00:00:00.001Z");
    expect(rows.at(0).text()).toContain("1.0 KB");
    expect(rows.at(0).text()).toContain("application/json");
    expect(rows.at(0).text()).toContain("key: value");

    expect(rows.at(1).text()).toContain("1970-01-01T00:00:00.002Z");
    expect(rows.at(1).text()).toContain("2.0 KB");
    expect(rows.at(1).text()).toContain("text/plain");
    expect(rows.at(1).text()).toContain("type: test");
  });

  it("should toggle between ISO and Unix timestamps", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    const checkbox = wrapper.find(".ant-checkbox-input");
    act(() => {
      checkbox.simulate("change", { target: { checked: true } });
    });

    const rows = wrapper.find(".ant-table-row");
    expect(rows.at(0).text()).toContain("1000");
    expect(rows.at(1).text()).toContain("2000");
  });

  it("should show a download icon for each record", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });
    const downloadIcons = wrapper.find(DownloadOutlined);
    expect(downloadIcons.length).toBe(2);
  });

  it("should create a download link on download icon click", async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await waitUntil(() => wrapper.update().find(".ant-table-row").length > 0);
    });

    act(() => {
      wrapper.find(DownloadOutlined).at(0).simulate("click");
    });
    wrapper.update();

    const downloadLink = wrapper.find("a");
    expect(downloadLink.length).toBe(1);
  });
});
