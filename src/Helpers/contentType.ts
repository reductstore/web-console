import mime from "mime-types";

// Custom type mappings not covered by mime-types
const customMappings: Record<string, string> = {
  mcap: "application/mcap",
};

/**
 * Determine the content type based on file name extension.
 * Falls back to application/octet-stream if the type is unknown.
 */
export function getContentTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (customMappings[ext]) {
    return customMappings[ext];
  }
  const type = mime.lookup(ext);
  if (typeof type === "string") {
    return type;
  }

  return "application/octet-stream";
}

/**
 * Determine file extension (including leading dot) from a content type.
 * Returns ".bin" when no suitable extension can be found.
 */
export function getExtensionFromContentType(contentType: string): string {
  const ext = mime.extension(contentType);
  if (ext) {
    return `.${ext}`;
  }
  for (const [extension, type] of Object.entries(customMappings)) {
    if (type === contentType) {
      return `.${extension}`;
    }
  }
  return ".bin";
}
