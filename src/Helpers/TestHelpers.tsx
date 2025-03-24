import { createMemoryHistory } from "history";
import { RouteComponentProps } from "react-router-dom";
import waitUntil from "async-wait-until";
import { ReactWrapper } from "enzyme";
import { act } from "react-dom/test-utils";
import { RcFile } from "antd/es/upload";
import { TextDecoder, TextEncoder } from "util";

export const makeRouteProps = (): RouteComponentProps => {
  return {
    match: {
      isExact: false,
      path: "",
      url: "",
      params: { id: "1" },
    },
    // @ts-ignore
    location: {},
    // @ts-ignore
    history: createMemoryHistory(),
  };
};

export const mockJSDOM = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

export const waitUntilFind = async (wrapper: ReactWrapper, predictor: any) => {
  let elements: any = [];
  try {
    await waitUntil(
      () => {
        act(() => {
          // @ts-ignore
          elements = wrapper.update().find(predictor);
        });
        return elements.length > 0;
      },
      { timeout: 2000 },
    );
  } catch (e) {
    return undefined;
  }

  return elements;
};

// Mock the File API
export class MockFile implements RcFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  lastModifiedDate: Date;
  uid: string;
  content: Uint8Array;

  // @ts-ignore
  webkitRelativePath: string;

  constructor(
    bits: Array<string | Uint8Array>,
    filename: string,
    options: { type: string; lastModified: number },
  ) {
    this.name = filename;
    this.type = options.type;
    this.lastModified = options.lastModified;
    this.lastModifiedDate = new Date(options.lastModified);
    this.uid = "1";

    // Convert inputs to Uint8Arrays
    const arrays = bits.map((bit) =>
      typeof bit === "string" ? new TextEncoder().encode(bit) : bit,
    );

    // Calculate total length
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);

    // Create a single Uint8Array and copy all data
    this.content = new Uint8Array(totalLength);
    let offset = 0;
    arrays.forEach((arr) => {
      this.content.set(arr, offset);
      offset += arr.length;
    });

    this.size = this.content.length;
  }

  async arrayBuffer() {
    return this.content.buffer as ArrayBuffer;
  }

  async text() {
    return new TextDecoder().decode(this.content);
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    return new Blob([this.content.slice(start, end)], { type: contentType });
  }

  stream(): ReadableStream {
    const { content } = this;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(content);
        controller.close();
      },
    });
  }

  bytes(): Promise<Uint8Array> {
    return Promise.resolve(this.content);
  }
}
