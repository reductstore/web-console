import React from "react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { mount } from "enzyme";
import { MemoryRouter } from "react-router-dom";
import EntryCard from "./EntryCard";
import { EntryInfo, Client, Status } from "reduct-js";
import { DeleteOutlined, NodeCollapseOutlined } from "@ant-design/icons";

describe("EntryCard", () => {
  beforeEach(() => mockJSDOM());

  const info: EntryInfo = {
    name: "entry",
    size: 50000n,
    recordCount: 5n,
    blockCount: 2n,
    oldestRecord: 1000000n,
    latestRecord: 2000000n,
    status: Status.READY,
  };

  const client = new Client("");
  const onRemoved = jest.fn();

  const mountWithRouter = (component: React.ReactElement) =>
    mount(<MemoryRouter>{component}</MemoryRouter>);

  it("shows remove button with permissions", async () => {
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: true }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    expect(wrapper.find(DeleteOutlined).length).toEqual(1);
  });

  it("does not show remove button without permissions", async () => {
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: false }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    expect(wrapper.find(DeleteOutlined).length).toEqual(0);
  });

  it("displays timestamps in UTC format by default", async () => {
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(4).text()).toContain("1970-01-01");
    expect(timestamps.at(5).text()).toContain("1970-01-01");
  });

  it("displays timestamps in Unix format when showUnix is true", async () => {
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        showUnix={true}
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(4).text()).toEqual("1000000");
    expect(timestamps.at(5).text()).toEqual("2000000");
  });

  it("displays --- for timestamps when recordCount is 0", async () => {
    const emptyInfo = { ...info, recordCount: 0n };
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={emptyInfo}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const timestamps = wrapper.find(".ant-statistic-content-value");
    expect(timestamps.at(3).text()).toEqual("---");
    expect(timestamps.at(4).text()).toEqual("---");
  });

  it("shows deleting state and disables remove action", async () => {
    const wrapper = mountWithRouter(
      <EntryCard
        entryInfo={{ ...info, status: Status.DELETING }}
        permissions={{ fullAccess: true }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    expect(wrapper.render().text()).toContain("Deleting");
    const deleteButton = wrapper.find(DeleteOutlined);
    expect(deleteButton.prop("onClick")).toBeUndefined();
  });

  describe("Aggregation Toggle", () => {
    const entriesWithChild: EntryInfo[] = [
      info,
      {
        name: "entry/sub1",
        size: 10000n,
        recordCount: 2n,
        blockCount: 1n,
        oldestRecord: 500000n,
        latestRecord: 1500000n,
        status: Status.READY,
      },
    ];

    it("shows aggregation toggle button for non-leaf entries", async () => {
      const wrapper = mountWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={entriesWithChild}
          allEntryNames={entriesWithChild.map((e) => e.name)}
        />,
      );

      expect(wrapper.find(NodeCollapseOutlined).length).toEqual(1);
    });

    it("hides aggregation toggle button for leaf entries", async () => {
      const wrapper = mountWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={[info]}
          allEntryNames={[info.name]}
        />,
      );

      expect(wrapper.find(NodeCollapseOutlined).length).toEqual(0);
    });

    it("aggregates stats from sub-entries when showAggregated is true", async () => {
      const wrapper = mountWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={entriesWithChild}
          allEntryNames={entriesWithChild.map((e) => e.name)}
        />,
      );

      const stats = wrapper.find(".ant-statistic-content-value");
      expect(stats.at(1).text()).toEqual("7");
    });
  });
});
