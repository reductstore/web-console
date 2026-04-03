import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedQuery {
  name: string;
  query: string;
  timeFormat?: "UTC" | "Unix";
  rangeKey?: string;
  /** Microsecond timestamps stored as strings (bigint doesn't serialize) */
  rangeStart?: string;
  rangeEnd?: string;
  /** Saved selection context for restoring on the query page */
  bucketName?: string;
  entries?: string[];
}

interface QueryStore {
  queries: Record<string, SavedQuery[]>;
  loadedQueryNames: Record<string, string | null>;

  getQueries: (
    bucketName: string,
    entryName: string | string[],
  ) => SavedQuery[];
  getAllQueries: () => { key: string; queries: SavedQuery[] }[];
  getLoadedQueryName: (
    bucketName: string,
    entryName: string | string[],
  ) => string | null;
  saveQuery: (
    bucketName: string,
    entryName: string | string[],
    saved: SavedQuery,
  ) => void;
  deleteQuery: (
    bucketName: string,
    entryName: string | string[],
    name: string,
  ) => void;
  deleteQueryByKey: (key: string, name: string) => void;
  setLoadedQueryName: (
    bucketName: string,
    entryName: string | string[],
    name: string | null,
  ) => void;
  clearQueries: () => void;
}

const MULTI_MARKER = "/__multi__/";
const ENTRY_SEP = "\u0001";

const normalizeEntries = (entryName: string | string[]): string[] => {
  const entries = Array.isArray(entryName) ? entryName : [entryName];
  return Array.from(
    new Set(entries.map((entry) => entry.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
};

const entryKey = (bucketName: string, entryName: string | string[]): string => {
  const entries = normalizeEntries(entryName);
  if (entries.length === 1) {
    return `${bucketName}/${entries[0]}`;
  }

  return `${bucketName}${MULTI_MARKER}${entries.join(ENTRY_SEP)}`;
};

export const formatQueryKey = (key: string): string => {
  const multiIdx = key.indexOf(MULTI_MARKER);
  if (multiIdx === -1) return key;

  const bucket = key.substring(0, multiIdx);
  const entries = key
    .substring(multiIdx + MULTI_MARKER.length)
    .split(ENTRY_SEP);
  if (entries.length === 1) {
    return `${bucket} / ${entries[0]}`;
  }
  return `${bucket} / ${entries[0]} +${entries.length - 1} more`;
};

export const useQueryStore = create<QueryStore>()(
  persist(
    (set, get) => ({
      queries: {},
      loadedQueryNames: {},

      getQueries: (bucketName: string, entryName: string | string[]) => {
        return get().queries[entryKey(bucketName, entryName)] || [];
      },

      getAllQueries: () => {
        const allQueries = get().queries;
        return Object.entries(allQueries)
          .filter(([, queries]) => queries.length > 0)
          .map(([key, queries]) => ({ key, queries }));
      },

      getLoadedQueryName: (
        bucketName: string,
        entryName: string | string[],
      ) => {
        return get().loadedQueryNames[entryKey(bucketName, entryName)] ?? null;
      },

      saveQuery: (
        bucketName: string,
        entryName: string | string[],
        saved: SavedQuery,
      ) => {
        const key = entryKey(bucketName, entryName);
        const existing = get().queries[key] || [];
        const filtered = existing.filter((q) => q.name !== saved.name);
        const updated = [...filtered, saved].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        set((state) => ({
          queries: { ...state.queries, [key]: updated },
          loadedQueryNames: {
            ...state.loadedQueryNames,
            [key]: saved.name,
          },
        }));
      },

      deleteQuery: (
        bucketName: string,
        entryName: string | string[],
        name: string,
      ) => {
        get().deleteQueryByKey(entryKey(bucketName, entryName), name);
      },

      deleteQueryByKey: (key: string, name: string) => {
        const existing = get().queries[key] || [];
        const updated = existing.filter((q) => q.name !== name);
        const currentLoaded = get().loadedQueryNames[key];
        set((state) => ({
          queries: { ...state.queries, [key]: updated },
          loadedQueryNames: {
            ...state.loadedQueryNames,
            [key]: currentLoaded === name ? null : currentLoaded,
          },
        }));
      },

      setLoadedQueryName: (
        bucketName: string,
        entryName: string | string[],
        name: string | null,
      ) => {
        const key = entryKey(bucketName, entryName);
        set((state) => ({
          loadedQueryNames: { ...state.loadedQueryNames, [key]: name },
        }));
      },

      clearQueries: () => {
        set({ queries: {}, loadedQueryNames: {} });
      },
    }),
    {
      name: "reduct:savedQueries",
      partialize: (state) => ({
        queries: state.queries,
        loadedQueryNames: state.loadedQueryNames,
      }),
    },
  ),
);
