import React from "react";
import { mockJSDOM } from "../../Helpers/TestHelpers";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EntryCard from "./EntryCard";
import { EntryInfo, Client, Status } from "reduct-js";

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
  const onRemoved = vi.fn();

  const renderWithRouter = (component: React.ReactElement) =>
    render(<MemoryRouter>{component}</MemoryRouter>);

  it("shows remove button with permissions", () => {
    renderWithRouter(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: true }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    expect(screen.getByTitle("Remove entry")).toBeInTheDocument();
  });

  it("does not show remove button without permissions", () => {
    renderWithRouter(
      <EntryCard
        entryInfo={info}
        permissions={{ fullAccess: false }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );
    expect(screen.queryByTitle("Remove entry")).toBeNull();
  });

  it("displays timestamps in UTC format by default", () => {
    const { container } = renderWithRouter(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const statValues = container.querySelectorAll(
      ".ant-statistic-content-value",
    );
    expect(statValues[4].textContent).toContain("1970-01-01");
    expect(statValues[5].textContent).toContain("1970-01-01");
  });

  it("displays timestamps in Unix format when showUnix is true", () => {
    const { container } = renderWithRouter(
      <EntryCard
        entryInfo={info}
        client={client}
        bucketName="test-bucket"
        showUnix={true}
        onRemoved={onRemoved}
      />,
    );

    const statValues = container.querySelectorAll(
      ".ant-statistic-content-value",
    );
    expect(statValues[4].textContent).toEqual("1000000");
    expect(statValues[5].textContent).toEqual("2000000");
  });

  it("displays --- for timestamps when recordCount is 0", () => {
    const emptyInfo = { ...info, recordCount: 0n };
    const { container } = renderWithRouter(
      <EntryCard
        entryInfo={emptyInfo}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    const statValues = container.querySelectorAll(
      ".ant-statistic-content-value",
    );
    expect(statValues[3].textContent).toEqual("---");
    expect(statValues[4].textContent).toEqual("---");
  });

  it("shows deleting state and disables remove action", () => {
    renderWithRouter(
      <EntryCard
        entryInfo={{ ...info, status: Status.DELETING }}
        permissions={{ fullAccess: true }}
        client={client}
        bucketName="test-bucket"
        onRemoved={onRemoved}
      />,
    );

    expect(screen.getByText("Deleting")).toBeInTheDocument();
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

    it("shows aggregation toggle button for non-leaf entries", () => {
      renderWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={entriesWithChild}
          allEntryNames={entriesWithChild.map((e) => e.name)}
        />,
      );

      expect(screen.getByTitle("Entry Stats")).toBeInTheDocument();
    });

    it("hides aggregation toggle button for leaf entries", () => {
      renderWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={[info]}
          allEntryNames={[info.name]}
        />,
      );

      expect(screen.queryByTitle("Entry Stats")).toBeNull();
    });

    it("aggregates stats from sub-entries when showAggregated is true", () => {
      const { container } = renderWithRouter(
        <EntryCard
          entryInfo={info}
          client={client}
          bucketName="test-bucket"
          onRemoved={onRemoved}
          allEntries={entriesWithChild}
          allEntryNames={entriesWithChild.map((e) => e.name)}
        />,
      );

      const statValues = container.querySelectorAll(
        ".ant-statistic-content-value",
      );
      expect(statValues[1].textContent).toEqual("7");
    });
  });
});
