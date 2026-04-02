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
}

interface QueryStore {
  queries: Record<string, SavedQuery[]>;
  loadedQueryNames: Record<string, string | null>;

  getQueries: (bucketName: string, entryName: string) => SavedQuery[];
  getLoadedQueryName: (bucketName: string, entryName: string) => string | null;
  saveQuery: (bucketName: string, entryName: string, saved: SavedQuery) => void;
  deleteQuery: (bucketName: string, entryName: string, name: string) => void;
  setLoadedQueryName: (
    bucketName: string,
    entryName: string,
    name: string | null,
  ) => void;
  clearQueries: () => void;
}

const entryKey = (bucketName: string, entryName: string): string =>
  `${bucketName}/${entryName}`;

export const useQueryStore = create<QueryStore>()(
  persist(
    (set, get) => ({
      queries: {},
      loadedQueryNames: {},

      getQueries: (bucketName: string, entryName: string) => {
        return get().queries[entryKey(bucketName, entryName)] || [];
      },

      getLoadedQueryName: (bucketName: string, entryName: string) => {
        return get().loadedQueryNames[entryKey(bucketName, entryName)] ?? null;
      },

      saveQuery: (bucketName: string, entryName: string, saved: SavedQuery) => {
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

      deleteQuery: (bucketName: string, entryName: string, name: string) => {
        const key = entryKey(bucketName, entryName);
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
        entryName: string,
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
