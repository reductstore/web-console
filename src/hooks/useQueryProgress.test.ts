import { renderHook, act } from "@testing-library/react";
import { useQueryProgress } from "./useQueryProgress";
import type { EntryInfo } from "reduct-js";

const makeEntry = (
  name: string,
  oldest: bigint,
  latest: bigint,
  recordCount = BigInt(100),
): EntryInfo =>
  ({
    name,
    oldestRecord: oldest,
    latestRecord: latest,
    recordCount,
    size: BigInt(1000),
  }) as unknown as EntryInfo;

describe("useQueryProgress", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts in idle state", () => {
    const { result } = renderHook(() => useQueryProgress());
    expect(result.current.status).toBe("idle");
    expect(result.current.percent).toBe(0);
    expect(result.current.eta).toBeNull();
  });

  it("transitions to fetching on start", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    expect(result.current.status).toBe("fetching");
    expect(result.current.percent).toBe(0);
  });

  it("computes progress from timestamp coverage", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("s", BigInt(49)));
    expect(result.current.percent).toBe(50);
  });

  it("caps percent at 99 before done", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("s", BigInt(99)));
    expect(result.current.percent).toBe(99);
  });

  it("sets percent to 100 on done", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    act(() => result.current.done());
    expect(result.current.status).toBe("done");
    expect(result.current.percent).toBe(100);
  });

  it("handles cancel", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    act(() => result.current.cancel());
    expect(result.current.status).toBe("stopped");
  });

  it("resets to idle", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    act(() => result.current.done());
    act(() => result.current.reset());
    expect(result.current.status).toBe("idle");
    expect(result.current.percent).toBe(0);
  });

  it("computes elapsed and ETA in HH:MM:SS format", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    vi.advanceTimersByTime(5000);
    act(() => result.current.update("s", BigInt(49)));
    expect(result.current.elapsed).toBe("5s");
    expect(result.current.eta).toBe("5s");
  });

  it("tracks per-entry coverage independently", () => {
    const { result } = renderHook(() => useQueryProgress());
    const entries = [
      makeEntry("a", BigInt(0), BigInt(99)),
      makeEntry("b", BigInt(50), BigInt(149)),
    ];
    act(() => result.current.start(entries, ["a", "b"]));
    vi.advanceTimersByTime(1000);

    act(() => result.current.update("a", BigInt(99)));
    expect(result.current.percent).toBe(50);

    act(() => result.current.update("b", BigInt(149)));
    expect(result.current.percent).toBe(99);
  });

  it("does not regress with overlapping entries", () => {
    const { result } = renderHook(() => useQueryProgress());
    const entries = [
      makeEntry("a", BigInt(0), BigInt(100)),
      makeEntry("b", BigInt(50), BigInt(150)),
    ];
    act(() => result.current.start(entries, ["a", "b"]));
    vi.advanceTimersByTime(1000);

    act(() => result.current.update("a", BigInt(100)));
    const afterA = result.current.percent;
    act(() => result.current.update("b", BigInt(50)));
    expect(result.current.percent).toBeGreaterThanOrEqual(afterA);
  });

  it("clamps query range to entry data range", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start(
        [makeEntry("s", BigInt(20), BigInt(80))],
        ["s"],
        BigInt(0),
        BigInt(100),
      ),
    );
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("s", BigInt(50)));
    expect(result.current.percent).toBe(50);
  });

  it("narrows entry range to query bounds", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start(
        [makeEntry("s", BigInt(0), BigInt(200))],
        ["s"],
        BigInt(50),
        BigInt(150),
      ),
    );
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("s", BigInt(100)));
    expect(result.current.percent).toBe(50);
  });

  it("matches wildcard patterns", () => {
    const { result } = renderHook(() => useQueryProgress());
    const entries = [
      makeEntry("sensor-1", BigInt(0), BigInt(99)),
      makeEntry("sensor-2", BigInt(0), BigInt(99)),
      makeEntry("other", BigInt(0), BigInt(99)),
    ];
    act(() => result.current.start(entries, ["sensor-*"]));
    vi.advanceTimersByTime(1000);

    act(() => result.current.update("sensor-1", BigInt(99)));
    expect(result.current.percent).toBe(50);

    act(() => result.current.update("other", BigInt(99)));
    expect(result.current.percent).toBe(50);
  });

  it("ignores updates for unknown entries", () => {
    const { result } = renderHook(() => useQueryProgress());
    act(() =>
      result.current.start([makeEntry("s", BigInt(0), BigInt(99))], ["s"]),
    );
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("unknown", BigInt(50)));
    expect(result.current.percent).toBe(0);
  });

  it("skips entries with zero record count", () => {
    const { result } = renderHook(() => useQueryProgress());
    const entries = [
      makeEntry("empty", BigInt(0), BigInt(99), BigInt(0)),
      makeEntry("full", BigInt(0), BigInt(99)),
    ];
    act(() => result.current.start(entries, ["empty", "full"]));
    vi.advanceTimersByTime(1000);
    act(() => result.current.update("full", BigInt(49)));
    expect(result.current.percent).toBe(50);
  });

  it("wildcard uses literal prefix matching", () => {
    const { result } = renderHook(() => useQueryProgress());
    const entries = [
      makeEntry("data", BigInt(0), BigInt(99)),
      makeEntry("data/temp", BigInt(0), BigInt(99)),
      makeEntry("sensor-1.0/x", BigInt(0), BigInt(99)),
      makeEntry("sensor-1X0/x", BigInt(0), BigInt(99)),
    ];
    act(() => result.current.start(entries, ["data/*", "sensor-1.0/*"]));
    vi.advanceTimersByTime(1000);

    act(() => result.current.update("data", BigInt(99)));
    expect(result.current.percent).toBe(0);

    act(() => result.current.update("sensor-1X0/x", BigInt(99)));
    expect(result.current.percent).toBe(0);

    act(() => result.current.update("data/temp", BigInt(99)));
    expect(result.current.percent).toBe(50);

    act(() => result.current.update("sensor-1.0/x", BigInt(99)));
    expect(result.current.percent).toBe(99);
  });
});
