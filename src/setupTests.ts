import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Node 25+ ships a built-in localStorage that lacks setItem/getItem when
// --localstorage-file is not provided. Replace it with a working in-memory
// implementation for tests.
if (
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage.setItem !== "function"
) {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "localStorage", {
    value: storage,
    writable: true,
    configurable: true,
  });
}

// jsdom doesn't implement getComputedStyle with pseudo-elements, which antd
// triggers internally. Patch it to return an empty style for pseudo-elements.
const _origGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  if (pseudoElt) {
    return {} as CSSStyleDeclaration;
  }
  return _origGetComputedStyle(elt);
};

// antd components use ResizeObserver internally via @rc-component/resize-observer
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("react-chartjs-2", () => {
  return {
    Bar: () => null,
  };
});

// Add BigInt serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// Flush pending React scheduler callbacks (setImmediate) before jsdom teardown
// to prevent "window is not defined" errors leaking between test files.
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});
