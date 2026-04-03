/**
 * Helper functions for handling token permissions with wildcard support
 */

/**
 * Checks if a bucket name matches any of the allowed bucket patterns.
 * Supports wildcards (*) in permission patterns.
 *
 * @param bucketName - The name of the bucket to check
 * @param allowedBuckets - Array of bucket patterns (can include wildcards like "bucket-*")
 * @returns true if the bucket is allowed, false otherwise
 */
export function matchesBucketPattern(
  bucketName: string,
  allowedBuckets: string[] | undefined,
): boolean {
  if (!allowedBuckets || allowedBuckets.length === 0) {
    return false;
  }

  return allowedBuckets.some((pattern) => {
    // If the pattern doesn't contain a wildcard, do exact matching
    if (!pattern.includes("*")) {
      return pattern === bucketName;
    }

    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
      .replace(/\*/g, ".*"); // Convert * to .*

    // Create regex with anchors to match the entire string
    const regex = new RegExp(`^${escapedPattern}$`);
    return regex.test(bucketName);
  });
}

/**
 * Checks if a user has write permission for a specific bucket.
 * Handles both fullAccess permissions and specific bucket permissions with wildcards.
 *
 * @param permissions - Token permissions object
 * @param bucketName - The name of the bucket to check
 * @returns true if the user has write permission, false otherwise
 */
export function checkWritePermission(
  permissions: { fullAccess?: boolean; write?: string[] } | undefined,
  bucketName: string,
): boolean {
  if (!permissions) {
    return false;
  }

  // Full access grants write permission to all buckets
  if (permissions.fullAccess) {
    return true;
  }

  // Check specific bucket permissions with wildcard support
  return matchesBucketPattern(bucketName, permissions.write);
}

/**
 * Checks if a user has read permission for a specific bucket.
 *
 * @param permissions - Token permissions object
 * @param bucketName - The name of the bucket to check
 * @returns true if the user has read permission, false otherwise
 */
export function checkReadPermission(
  permissions: { fullAccess?: boolean; read?: string[] } | undefined,
  bucketName: string,
): boolean {
  if (!permissions) {
    return false;
  }

  if (permissions.fullAccess) {
    return true;
  }

  return matchesBucketPattern(bucketName, permissions.read);
}
