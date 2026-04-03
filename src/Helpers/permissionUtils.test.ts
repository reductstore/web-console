import {
  checkReadPermission,
  matchesBucketPattern,
  checkWritePermission,
} from "./permissionUtils";

describe("matchesBucketPattern", () => {
  it("should return false when allowedBuckets is undefined", () => {
    expect(matchesBucketPattern("test-bucket", undefined)).toBe(false);
  });

  it("should return false when allowedBuckets is empty", () => {
    expect(matchesBucketPattern("test-bucket", [])).toBe(false);
  });

  it("should handle exact bucket name matching", () => {
    const allowedBuckets = ["bucket1", "bucket2", "special-bucket"];

    expect(matchesBucketPattern("bucket1", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket2", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("special-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket3", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("bucket", allowedBuckets)).toBe(false);
  });

  it("should handle wildcard patterns at the end", () => {
    const allowedBuckets = ["bucket-*"];

    expect(matchesBucketPattern("bucket-123", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-test", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-a-b-c", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("other-bucket-123", allowedBuckets)).toBe(
      false,
    );
  });

  it("should handle wildcard patterns at the beginning", () => {
    const allowedBuckets = ["*-bucket"];

    expect(matchesBucketPattern("test-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("123-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("a-b-c-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("test-bucket-123", allowedBuckets)).toBe(false);
  });

  it("should handle wildcard patterns in the middle", () => {
    const allowedBuckets = ["bucket-*-data"];

    expect(matchesBucketPattern("bucket-test-data", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-123-data", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket--data", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-a-b-c-data", allowedBuckets)).toBe(
      true,
    );
    expect(matchesBucketPattern("bucket-test", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("bucket-data", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("test-bucket-data", allowedBuckets)).toBe(
      false,
    );
  });

  it("should handle multiple wildcard patterns", () => {
    const allowedBuckets = ["*-bucket-*"];

    expect(matchesBucketPattern("test-bucket-123", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("a-bucket-b", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("-bucket-", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket-123", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("test-bucket", allowedBuckets)).toBe(false);
  });

  it("should handle mixed exact and wildcard patterns", () => {
    const allowedBuckets = [
      "exact-bucket",
      "wildcard-*",
      "*-suffix",
      "another-exact",
    ];

    // Exact matches
    expect(matchesBucketPattern("exact-bucket", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("another-exact", allowedBuckets)).toBe(true);

    // Wildcard matches
    expect(matchesBucketPattern("wildcard-123", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("test-suffix", allowedBuckets)).toBe(true);

    // Non-matches
    expect(matchesBucketPattern("other-bucket", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("wildcard", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("suffix", allowedBuckets)).toBe(false);
  });

  it("should escape special regex characters in patterns", () => {
    const allowedBuckets = ["bucket.test.*", "bucket+special.*"];

    expect(matchesBucketPattern("bucket.test.123", allowedBuckets)).toBe(true);
    expect(matchesBucketPattern("bucket+special.data", allowedBuckets)).toBe(
      true,
    );
    expect(matchesBucketPattern("bucketXtest.123", allowedBuckets)).toBe(false);
    expect(matchesBucketPattern("bucketXspecial.data", allowedBuckets)).toBe(
      false,
    );
  });

  it("should handle edge cases", () => {
    // Empty pattern
    expect(matchesBucketPattern("test", [""])).toBe(false);
    expect(matchesBucketPattern("", [""])).toBe(true);

    // Only wildcard
    expect(matchesBucketPattern("anything", ["*"])).toBe(true);
    expect(matchesBucketPattern("", ["*"])).toBe(true);

    // Multiple wildcards
    expect(matchesBucketPattern("test-123-data", ["**"])).toBe(true);
    expect(matchesBucketPattern("test-123-data", ["*-*-*"])).toBe(true);
  });
});

describe("checkWritePermission", () => {
  it("should return false when permissions is undefined", () => {
    expect(checkWritePermission(undefined, "test-bucket")).toBe(false);
  });

  it("should return true when fullAccess is true", () => {
    const permissions = { fullAccess: true };
    expect(checkWritePermission(permissions, "any-bucket")).toBe(true);
  });

  it("should return true when fullAccess is true even with empty write array", () => {
    const permissions = { fullAccess: true, write: [] };
    expect(checkWritePermission(permissions, "any-bucket")).toBe(true);
  });

  it("should check write permissions with exact matching", () => {
    const permissions = { fullAccess: false, write: ["bucket1", "bucket2"] };

    expect(checkWritePermission(permissions, "bucket1")).toBe(true);
    expect(checkWritePermission(permissions, "bucket2")).toBe(true);
    expect(checkWritePermission(permissions, "bucket3")).toBe(false);
  });

  it("should check write permissions with wildcard matching", () => {
    const permissions = {
      fullAccess: false,
      write: ["bucket-*", "test-*-data"],
    };

    expect(checkWritePermission(permissions, "bucket-123")).toBe(true);
    expect(checkWritePermission(permissions, "bucket-test")).toBe(true);
    expect(checkWritePermission(permissions, "test-abc-data")).toBe(true);
    expect(checkWritePermission(permissions, "other-bucket")).toBe(false);
  });

  it("should return false when fullAccess is false and no write permissions", () => {
    const permissions = { fullAccess: false };
    expect(checkWritePermission(permissions, "test-bucket")).toBe(false);
  });

  it("should return false when fullAccess is false and empty write array", () => {
    const permissions = { fullAccess: false, write: [] };
    expect(checkWritePermission(permissions, "test-bucket")).toBe(false);
  });

  it("should handle permissions object without fullAccess property", () => {
    const permissions = { write: ["bucket-*"] };
    expect(checkWritePermission(permissions, "bucket-123")).toBe(true);
    expect(checkWritePermission(permissions, "other-bucket")).toBe(false);
  });
});

describe("checkReadPermission", () => {
  it("should return true when fullAccess is true", () => {
    expect(checkReadPermission({ fullAccess: true }, "bucket")).toBe(true);
  });

  it("should check read permissions with wildcard matching", () => {
    expect(
      checkReadPermission(
        { fullAccess: false, read: ["bucket-*"] },
        "bucket-a",
      ),
    ).toBe(true);
    expect(
      checkReadPermission({ fullAccess: false, read: ["bucket-*"] }, "other"),
    ).toBe(false);
  });
});
