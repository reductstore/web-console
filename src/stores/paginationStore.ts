import { create } from "zustand";

interface PaginationStore {
  pageSizes: Record<string, number>;
  setPageSize: (key: string, pageSize: number) => void;
  getPageSize: (key: string) => number;
  clearAllPageSizes: () => void;
}

const defaultPageSize = 10;

export const usePaginationStore = create<PaginationStore>()((set, get) => ({
  pageSizes: {},

  setPageSize: (key: string, pageSize: number) => {
    set((prevState) => ({
      pageSizes: {
        ...prevState.pageSizes,
        [key]: pageSize,
      },
    }));
  },

  getPageSize: (key: string) => {
    const pageSize = get().pageSizes[key];
    return pageSize || defaultPageSize;
  },

  clearAllPageSizes: () => {
    set({ pageSizes: {} });
  },
}));

export { defaultPageSize };
