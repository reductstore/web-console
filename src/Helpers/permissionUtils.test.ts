import {
  hasWritePermissionForBucket,
  checkWritePermission,
} from "./permissionUtils";

describe("hasWritePermissionForBucket", () => {
  it("should return false when allowedBuckets is undefined", () => {
    expect(hasWritePermissionForBucket("test-bucket", undefined)).toBe(false);
  });

  it("should return false when allowedBuckets is empty", () => {
    expect(hasWritePermissionForBucket("test-bucket", [])).toBe(false);
  });

  it("should handle exact bucket name matching", () => {
    const allowedBuckets = ["bucket1", "bucket2", "special-bucket"];

    expect(hasWritePermissionForBucket("bucket1", allowedBuckets)).toBe(true);
    expect(hasWritePermissionForBucket("bucket2", allowedBuckets)).toBe(true);
    expect(hasWritePermissionForBucket("special-bucket", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket3", allowedBuckets)).toBe(false);
    expect(hasWritePermissionForBucket("bucket", allowedBuckets)).toBe(false);
  });

  it("should handle wildcard patterns at the end", () => {
    const allowedBuckets = ["bucket-*"];

    expect(hasWritePermissionForBucket("bucket-123", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket-test", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket-", allowedBuckets)).toBe(true);
    expect(hasWritePermissionForBucket("bucket-a-b-c", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket", allowedBuckets)).toBe(false);
    expect(
      hasWritePermissionForBucket("other-bucket-123", allowedBuckets),
    ).toBe(false);
  });

  it("should handle wildcard patterns at the beginning", () => {
    const allowedBuckets = ["*-bucket"];

    expect(hasWritePermissionForBucket("test-bucket", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("123-bucket", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("-bucket", allowedBuckets)).toBe(true);
    expect(hasWritePermissionForBucket("a-b-c-bucket", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket", allowedBuckets)).toBe(false);
    expect(hasWritePermissionForBucket("test-bucket-123", allowedBuckets)).toBe(
      false,
    );
  });

  it("should handle wildcard patterns in the middle", () => {
    const allowedBuckets = ["bucket-*-data"];

    expect(
      hasWritePermissionForBucket("bucket-test-data", allowedBuckets),
    ).toBe(true);
    expect(hasWritePermissionForBucket("bucket-123-data", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("bucket--data", allowedBuckets)).toBe(
      true,
    );
    expect(
      hasWritePermissionForBucket("bucket-a-b-c-data", allowedBuckets),
    ).toBe(true);
    expect(hasWritePermissionForBucket("bucket-test", allowedBuckets)).toBe(
      false,
    );
    expect(hasWritePermissionForBucket("bucket-data", allowedBuckets)).toBe(
      false,
    );
    expect(
      hasWritePermissionForBucket("test-bucket-data", allowedBuckets),
    ).toBe(false);
  });

  it("should handle multiple wildcard patterns", () => {
    const allowedBuckets = ["*-bucket-*"];

    expect(hasWritePermissionForBucket("test-bucket-123", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("a-bucket-b", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("-bucket-", allowedBuckets)).toBe(true);
    expect(hasWritePermissionForBucket("bucket-123", allowedBuckets)).toBe(
      false,
    );
    expect(hasWritePermissionForBucket("test-bucket", allowedBuckets)).toBe(
      false,
    );
  });

  it("should handle mixed exact and wildcard patterns", () => {
    const allowedBuckets = [
      "exact-bucket",
      "wildcard-*",
      "*-suffix",
      "another-exact",
    ];

    // Exact matches
    expect(hasWritePermissionForBucket("exact-bucket", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("another-exact", allowedBuckets)).toBe(
      true,
    );

    // Wildcard matches
    expect(hasWritePermissionForBucket("wildcard-123", allowedBuckets)).toBe(
      true,
    );
    expect(hasWritePermissionForBucket("test-suffix", allowedBuckets)).toBe(
      true,
    );

    // Non-matches
    expect(hasWritePermissionForBucket("other-bucket", allowedBuckets)).toBe(
      false,
    );
    expect(hasWritePermissionForBucket("wildcard", allowedBuckets)).toBe(false);
    expect(hasWritePermissionForBucket("suffix", allowedBuckets)).toBe(false);
  });

  it("should escape special regex characters in patterns", () => {
    const allowedBuckets = ["bucket.test.*", "bucket+special.*"];

    expect(hasWritePermissionForBucket("bucket.test.123", allowedBuckets)).toBe(
      true,
    );
    expect(
      hasWritePermissionForBucket("bucket+special.data", allowedBuckets),
    ).toBe(true);
    expect(hasWritePermissionForBucket("bucketXtest.123", allowedBuckets)).toBe(
      false,
    );
    expect(
      hasWritePermissionForBucket("bucketXspecial.data", allowedBuckets),
    ).toBe(false);
  });

  it("should handle edge cases", () => {
    // Empty pattern
    expect(hasWritePermissionForBucket("test", [""])).toBe(false);
    expect(hasWritePermissionForBucket("", [""])).toBe(true);

    // Only wildcard
    expect(hasWritePermissionForBucket("anything", ["*"])).toBe(true);
    expect(hasWritePermissionForBucket("", ["*"])).toBe(true);

    // Multiple wildcards
    expect(hasWritePermissionForBucket("test-123-data", ["**"])).toBe(true);
    expect(hasWritePermissionForBucket("test-123-data", ["*-*-*"])).toBe(true);
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
