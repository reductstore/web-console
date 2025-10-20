import JSON5 from "json5";

export interface ParseResult {
  success: boolean;
  value?: any;
  error?: string;
}

/**
 * Safely parse JSON5/JSON input with fallback
 * Follows the parsing order: Try JSON.parse first, then JSON5.parse if it fails
 */
export function safeParseJSON5(input: string): ParseResult {
  if (!input.trim()) {
    return { success: true, value: {} };
  }

  try {
    const value = JSON.parse(input);
    return { success: true, value };
  } catch (jsonError) {
    try {
      const value = JSON5.parse(input);
      return { success: true, value };
    } catch (json5Error) {
      return {
        success: false,
        error: `Invalid JSON/JSON5: ${json5Error instanceof Error ? json5Error.message : "Unknown error"}`,
      };
    }
  }
}

/**
 * Format parsed value as strict JSON
 * Always uses JSON.stringify for output, never JSON5.stringify
 */
export function formatAsStrictJSON(value: any): string {
  try {
    return JSON.stringify(value, null, 2).trim() + "\n";
  } catch (error) {
    throw new Error(
      `Failed to format as JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Parse and format JSON5 input as strict JSON
 * Returns the original input if parsing fails
 */
export function parseAndFormat(input: string): {
  formatted: string;
  error?: string;
} {
  const parseResult = safeParseJSON5(input);

  if (!parseResult.success) {
    return {
      formatted: input,
      error: parseResult.error,
    };
  }

  try {
    const formatted = formatAsStrictJSON(parseResult.value);
    return { formatted };
  } catch (error) {
    return {
      formatted: input,
      error: error instanceof Error ? error.message : "Formatting error",
    };
  }
}

/**
 * Validate that parsed value is an object (not array/null)
 */
export function validateWhenCondition(value: any): {
  valid: boolean;
  error?: string;
} {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return {
      valid: false,
      error: "When condition must be a JSON object, not array or null",
    };
  }
  return { valid: true };
}

/**
 * Replace $__interval macros with intervalValue in the given object
 */
export function substituteMacros(obj: any, intervalValue: string): any {
  if (obj === null || typeof obj !== "object") {
    return obj === "$__interval" ? intervalValue : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteMacros(item, intervalValue));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = substituteMacros(value, intervalValue);
  }
  return result;
}

/**
 * Extract interval value from $each_t field in parsed condition object
 */
export function extractIntervalFromCondition(parsed: any): string | null {
  if (!parsed || typeof parsed !== "object") return null;

  if (parsed.$each_t) {
    return typeof parsed.$each_t === "string" ? parsed.$each_t : null;
  }

  for (const value of Object.values(parsed)) {
    if (value && typeof value === "object" && (value as any).$each_t) {
      const interval = (value as any).$each_t;
      return typeof interval === "string" ? interval : null;
    }
  }

  return null;
}

/**
 * JSON5 processing for When conditions
 * Parse JSON5 -> Validate -> Substitute macros -> Return strict JSON
 */
export function processWhenCondition(
  input: string,
  intervalValue?: string,
): { success: boolean; value?: any; error?: string } {
  const parseResult = safeParseJSON5(input);
  if (!parseResult.success) {
    return parseResult;
  }

  const validation = validateWhenCondition(parseResult.value);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  let processedValue = parseResult.value;

  if (intervalValue) {
    try {
      processedValue = substituteMacros(parseResult.value, intervalValue);
    } catch (error) {
      return {
        success: false,
        error: `Macro substitution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  return {
    success: true,
    value: processedValue,
  };
}
