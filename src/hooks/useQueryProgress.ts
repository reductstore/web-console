import { useCallback, useRef, useState } from "react";
import type { EntryInfo } from "reduct-js";

export type QueryStatus = "idle" | "fetching" | "done" | "stopped";

const formatDuration = (ms: number): string => {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const matchesPattern = (entryName: string, pattern: string): boolean => {
  if (pattern.endsWith("*")) {
    return entryName.startsWith(pattern.slice(0, -1));
  }
  return pattern === entryName;
};

interface TimeWindow {
  start: bigint;
  stop: bigint;
}

function coveredSpan(window: TimeWindow, timestamp: bigint): bigint {
  if (timestamp < window.start) return BigInt(0);
  const clamped = timestamp < window.stop ? timestamp : window.stop;
  return clamped - window.start + BigInt(1);
}

export function useQueryProgress() {
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [percent, setPercent] = useState(0);
  const [eta, setEta] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);

  const startTimeRef = useRef(0);
  const totalRef = useRef(BigInt(1));
  const windowsRef = useRef(new Map<string, TimeWindow>());
  const coveredByEntryRef = useRef(new Map<string, bigint>());
  const coveredTotalRef = useRef(BigInt(0));
  const lastPctRef = useRef(-1);

  const start = useCallback(
    (
      entries: EntryInfo[],
      selectedEntries: string[],
      queryStart?: bigint,
      queryEnd?: bigint,
    ) => {
      setStatus("fetching");
      setPercent(0);
      setEta(null);
      setElapsed(null);
      startTimeRef.current = Date.now();
      lastPctRef.current = -1;
      coveredByEntryRef.current = new Map();
      coveredTotalRef.current = BigInt(0);

      const windows = new Map<string, TimeWindow>();
      let total = BigInt(0);

      const matchingEntries = entries.filter((e) =>
        selectedEntries.some((sel) => matchesPattern(e.name, sel)),
      );

      for (const entry of matchingEntries) {
        if (entry.recordCount === BigInt(0)) continue;
        const wStart =
          queryStart !== undefined && queryStart > entry.oldestRecord
            ? queryStart
            : entry.oldestRecord;
        const wStop =
          queryEnd !== undefined && queryEnd < entry.latestRecord
            ? queryEnd
            : entry.latestRecord;
        if (wStart > wStop) continue;
        windows.set(entry.name, { start: wStart, stop: wStop });
        total += wStop - wStart + BigInt(1);
      }

      windowsRef.current = windows;
      totalRef.current = total > BigInt(0) ? total : BigInt(1);
    },
    [],
  );

  /** Call with each record's entry name and timestamp to update progress. */
  const update = useCallback((entryName: string, timestamp: bigint) => {
    const window = windowsRef.current.get(entryName);
    if (!window) return;

    const covered = coveredSpan(window, timestamp);
    const prev = coveredByEntryRef.current.get(entryName) ?? BigInt(0);
    if (covered > prev) {
      coveredTotalRef.current += covered - prev;
      coveredByEntryRef.current.set(entryName, covered);
    }

    const pct = Math.min(
      Number((coveredTotalRef.current * BigInt(100)) / totalRef.current),
      99,
    );

    if (pct !== lastPctRef.current) {
      lastPctRef.current = pct;
      setPercent(pct);
      const elapsedMs = Date.now() - startTimeRef.current;
      setElapsed(formatDuration(elapsedMs));
      if (pct > 0) {
        const remaining = Math.round((elapsedMs / pct) * (100 - pct));
        setEta(formatDuration(remaining));
      }
    }
  }, []);

  const done = useCallback(() => {
    setPercent(100);
    setEta(null);
    setStatus("done");
  }, []);

  const cancel = useCallback(() => {
    setEta(null);
    setStatus("stopped");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setPercent(0);
    setEta(null);
    setElapsed(null);
  }, []);

  return { status, percent, eta, elapsed, start, update, done, cancel, reset };
}
