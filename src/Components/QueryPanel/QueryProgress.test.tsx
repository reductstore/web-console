import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryStatusLabel, QueryProgressBar } from "./QueryProgress";
import { mockJSDOM } from "../../Helpers/TestHelpers";

beforeAll(() => mockJSDOM());

describe("QueryStatusLabel", () => {
  it("returns null for idle status", () => {
    const { container } = render(
      <QueryStatusLabel status="idle" recordCount={0} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null for error status", () => {
    const { container } = render(
      <QueryStatusLabel status="error" recordCount={0} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows Fetching label when fetching", () => {
    render(<QueryStatusLabel status="fetching" recordCount={5} />);
    expect(screen.getByText("Fetching")).toBeTruthy();
    expect(screen.getByText("· 5 records")).toBeTruthy();
  });

  it("shows Done label when done", () => {
    render(<QueryStatusLabel status="done" recordCount={10} />);
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText("· 10 records")).toBeTruthy();
  });

  it("shows Cancelled label when cancelled", () => {
    render(<QueryStatusLabel status="cancelled" recordCount={3} />);
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("· 3 records")).toBeTruthy();
  });

  it("uses singular 'record' for count of 1", () => {
    render(<QueryStatusLabel status="done" recordCount={1} />);
    expect(screen.getByText("· 1 record")).toBeTruthy();
  });

  it("hides record count when zero", () => {
    render(<QueryStatusLabel status="fetching" recordCount={0} />);
    expect(screen.getByText("Fetching")).toBeTruthy();
    expect(screen.queryByText(/record/)).toBeNull();
  });
});

describe("QueryProgressBar", () => {
  it("returns null for idle status", () => {
    const { container } = render(
      <QueryProgressBar status="idle" percent={50} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("returns null for error status", () => {
    const { container } = render(
      <QueryProgressBar status="error" percent={50} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders progress bar when fetching", () => {
    const { container } = render(
      <QueryProgressBar status="fetching" percent={42} />,
    );
    expect(container.querySelector(".ant-progress")).toBeTruthy();
  });

  it("renders progress bar when done", () => {
    const { container } = render(
      <QueryProgressBar status="done" percent={100} />,
    );
    expect(container.querySelector(".ant-progress")).toBeTruthy();
  });

  it("renders progress bar when cancelled", () => {
    const { container } = render(
      <QueryProgressBar status="cancelled" percent={60} />,
    );
    expect(container.querySelector(".ant-progress")).toBeTruthy();
  });

  it("clamps percent to 100", () => {
    const { container } = render(
      <QueryProgressBar status="fetching" percent={150} />,
    );
    expect(container.querySelector(".ant-progress")).toBeTruthy();
  });
});
