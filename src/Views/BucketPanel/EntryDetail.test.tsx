import React from "react";
import { mount, ReactWrapper } from "enzyme";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { Bucket, Client, EntryInfo } from "reduct-js";
import EntryDetail from "./EntryDetail";
import { MemoryRouter } from "react-router-dom";
import waitUntil from "async-wait-until";
import { act } from "react-dom/test-utils";

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

    bucket.beginRead = jest.fn().mockResolvedValue({
      read: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    });

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
});
