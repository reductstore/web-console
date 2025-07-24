import {
  getContentTypeFromFilename,
  getExtensionFromContentType,
} from "./contentType";

describe("contentType", () => {
  it("returns custom content type for mcap", () => {
    expect(getContentTypeFromFilename("test.mcap")).toBe("application/mcap");
  });
  it("returns application/octet-stream for unknown extension", () => {
    expect(getContentTypeFromFilename("file.unknownext")).toBe(
      "application/octet-stream",
    );
  });
  it("returns MIME type for well known extension like txt", () => {
    expect(getContentTypeFromFilename("document.txt")).toBe("text/plain");
  });

  it("returns custom extension from content type", () => {
    expect(getExtensionFromContentType("application/mcap")).toBe(".mcap");
  });
  it("returns .bin for unknown content type", () => {
    expect(getExtensionFromContentType("application/unknown")).toBe(".bin");
  });
  it("returns extension for well known content type like text/plain", () => {
    expect(getExtensionFromContentType("text/plain")).toBe(".txt");
  });
});
