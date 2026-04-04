import { RcFile } from "antd/es/upload";
import { TextDecoder, TextEncoder } from "util";

export const mockJSDOM = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
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

  bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return Promise.resolve(new Uint8Array(this.content));
  }
}
