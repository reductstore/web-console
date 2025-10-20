import {
  safeParseJSON5,
  formatAsStrictJSON,
  parseAndFormat,
  validateWhenCondition,
  substituteMacros,
  extractIntervalFromCondition,
  processWhenCondition,
} from "./json5Utils";

describe("json5Utils", () => {
  describe("safeParseJSON5", () => {
    it("should parse valid JSON", () => {
      const result = safeParseJSON5('{"key": "value"}');
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should parse valid JSON5 with comments", () => {
      const result = safeParseJSON5(`{
        // This is a comment
        "key": "value"
      }`);
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should parse JSON5 with trailing commas", () => {
      const result = safeParseJSON5('{"key": "value",}');
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should parse JSON5 with unquoted keys", () => {
      const result = safeParseJSON5('{key: "value"}');
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should parse JSON5 with single quotes", () => {
      const result = safeParseJSON5("{'key': 'value'}");
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should return empty object for empty string", () => {
      const result = safeParseJSON5("");
      expect(result.success).toBe(true);
      expect(result.value).toEqual({});
    });

    it("should return error for invalid JSON/JSON5", () => {
      const result = safeParseJSON5("invalid json");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JSON/JSON5");
    });

    it("should try JSON first, then JSON5", () => {
      const validJson = safeParseJSON5('{"key": "value"}');
      expect(validJson.success).toBe(true);

      const json5Only = safeParseJSON5('{key: "value"}');
      expect(json5Only.success).toBe(true);
    });
  });

  describe("formatAsStrictJSON", () => {
    it("should format object as strict JSON", () => {
      const result = formatAsStrictJSON({ key: "value" });
      expect(result).toBe('{\n  "key": "value"\n}\n');
    });

    it("should format nested objects", () => {
      const result = formatAsStrictJSON({ outer: { inner: "value" } });
      expect(result).toBe('{\n  "outer": {\n    "inner": "value"\n  }\n}\n');
    });

    it("should throw error for non-serializable values", () => {
      const circular: any = {};
      circular.self = circular;
      expect(() => formatAsStrictJSON(circular)).toThrow(
        "Failed to format as JSON",
      );
    });
  });

  describe("parseAndFormat", () => {
    it("should parse and format valid JSON5", () => {
      const result = parseAndFormat('{key: "value"}');
      expect(result.formatted).toBe('{\n  "key": "value"\n}\n');
      expect(result.error).toBeUndefined();
    });

    it("should return original input on parse error", () => {
      const invalid = "invalid json";
      const result = parseAndFormat(invalid);
      expect(result.formatted).toBe(invalid);
      expect(result.error).toContain("Invalid JSON/JSON5");
    });
  });

  describe("validateWhenCondition", () => {
    it("should accept valid objects", () => {
      const result = validateWhenCondition({ key: "value" });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject arrays", () => {
      const result = validateWhenCondition(["array"]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be a JSON object");
    });

    it("should reject null", () => {
      const result = validateWhenCondition(null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be a JSON object");
    });

    it("should reject primitives", () => {
      const result = validateWhenCondition("string");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be a JSON object");
    });
  });

  describe("substituteMacros", () => {
    it("should replace $__interval macros in simple objects", () => {
      const input = { $each_t: "$__interval" };
      const result = substituteMacros(input, "5m");
      expect(result).toEqual({ $each_t: "5m" });
    });

    it("should replace macros in nested objects", () => {
      const input = {
        condition: {
          $each_t: "$__interval",
        },
        other: "value",
      };
      const result = substituteMacros(input, "10s");
      expect(result).toEqual({
        condition: {
          $each_t: "10s",
        },
        other: "value",
      });
    });

    it("should replace macros in arrays", () => {
      const input = ["$__interval", { value: "$__interval" }];
      const result = substituteMacros(input, "1h");
      expect(result).toEqual(["1h", { value: "1h" }]);
    });

    it("should not modify non-macro values", () => {
      const input = {
        normal: "value",
        number: 42,
        boolean: true,
        nested: {
          array: [1, 2, 3],
        },
      };
      const result = substituteMacros(input, "5m");
      expect(result).toEqual(input);
    });

    it("should handle null and primitive values", () => {
      expect(substituteMacros(null, "5m")).toBe(null);
      expect(substituteMacros("$__interval", "5m")).toBe("5m");
      expect(substituteMacros("other", "5m")).toBe("other");
      expect(substituteMacros(42, "5m")).toBe(42);
    });
  });

  describe("extractIntervalFromCondition", () => {
    it("should extract $each_t from top-level object", () => {
      const result = extractIntervalFromCondition({ $each_t: "5m" });
      expect(result).toBe("5m");
    });

    it("should extract $each_t from nested object values", () => {
      const result = extractIntervalFromCondition({
        condition: { $each_t: "10s" },
      });
      expect(result).toBe("10s");
    });

    it("should return null for null input", () => {
      const result = extractIntervalFromCondition(null);
      expect(result).toBeNull();
    });

    it("should return null for undefined input", () => {
      const result = extractIntervalFromCondition(undefined);
      expect(result).toBeNull();
    });

    it("should return null for objects without $each_t", () => {
      const result = extractIntervalFromCondition({ key: "value" });
      expect(result).toBeNull();
    });

    it("should return null for non-string $each_t values", () => {
      const result = extractIntervalFromCondition({ $each_t: 123 });
      expect(result).toBeNull();
    });

    it("should return null for primitive values", () => {
      expect(extractIntervalFromCondition("string")).toBeNull();
      expect(extractIntervalFromCondition(42)).toBeNull();
      expect(extractIntervalFromCondition(true)).toBeNull();
    });

    it("should find first string $each_t in nested structure", () => {
      const result = extractIntervalFromCondition({
        first: { $each_t: "1h" },
        second: { $each_t: "2h" },
      });
      expect(result).toBe("1h");
    });

    it("should handle arrays as object values", () => {
      const result = extractIntervalFromCondition({
        conditions: [{ $each_t: "30s" }, { other: "value" }],
      });
      expect(result).toBeNull(); // Arrays don't have $each_t property directly
    });
  });

  describe("processWhenCondition", () => {
    it("should process valid JSON5 condition", () => {
      const result = processWhenCondition('{key: "value"}'); // JSON5 syntax
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ key: "value" });
    });

    it("should substitute macros when interval provided", () => {
      const result = processWhenCondition('{"$each_t": "$__interval"}', "5m");
      expect(result.success).toBe(true);
      expect(result.value).toEqual({ $each_t: "5m" });
    });

    it("should reject invalid JSON/JSON5", () => {
      const result = processWhenCondition("invalid json");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid JSON/JSON5");
    });

    it("should reject non-object values", () => {
      const result = processWhenCondition('["array"]');
      expect(result.success).toBe(false);
      expect(result.error).toContain("must be a JSON object");
    });

    it("should handle empty input", () => {
      const result = processWhenCondition("");
      expect(result.success).toBe(true);
      expect(result.value).toEqual({});
    });

    it("should process complex conditions with macros", () => {
      const input = `{
        // Comment
        $and: [
          {"&score": {$gt: 0.5}},
          {"$each_t": "$__interval"}
        ]
      }`;
      const result = processWhenCondition(input, "2h");
      expect(result.success).toBe(true);
      expect(result.value).toEqual({
        $and: [{ "&score": { $gt: 0.5 } }, { $each_t: "2h" }],
      });
    });
  });
});
