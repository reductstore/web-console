import { useState, useCallback } from "react";

interface UseBulkDeleteOptions {
  onDelete: (key: string) => Promise<void>;
  onStart?: (keys: string[]) => void;
  onSuccess?: () => void;
  onError?: (failures: string[]) => void;
  resourceType: string;
  delay?: number;
}

interface UseBulkDeleteResult {
  handleBulkDelete: (keys: string[]) => Promise<void>;
  bulkDeleting: boolean;
  bulkProgress: { done: number; total: number } | null;
  bulkError: string | null;
  setBulkError: (error: string | null) => void;
}

export function useBulkDelete({
  onDelete,
  onStart,
  onSuccess,
  onError,
  resourceType,
  delay = 300,
}: UseBulkDeleteOptions): UseBulkDeleteResult {
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleBulkDelete = useCallback(
    async (keys: string[]) => {
      setBulkDeleting(true);
      setBulkError(null);
      onStart?.(keys);
      const total = keys.length;
      let done = 0;
      const failures: string[] = [];

      for (const key of keys) {
        try {
          await onDelete(key);
          done++;
          setBulkProgress({ done, total });
        } catch (err: any) {
          failures.push(`${key}: ${err.message || "failed"}`);
          done++;
          setBulkProgress({ done, total });
        }
        if (done < total) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      setBulkDeleting(false);
      setBulkProgress(null);

      if (failures.length > 0) {
        onError?.(failures);
      }

      onSuccess?.();
    },
    [onDelete, onStart, onSuccess, onError, resourceType, delay],
  );

  return {
    handleBulkDelete,
    bulkDeleting,
    bulkProgress,
    bulkError,
    setBulkError,
  };
}
