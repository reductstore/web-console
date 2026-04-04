import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "build/**",
      "coverage/**",
      "node_modules/**",
      "*.cjs",
      "*.js",
      "src/__mocks__/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "no-var": "error",
      "@typescript-eslint/no-unused-vars": [2, { args: "none" }],
      "prefer-const": "error",
      "prefer-arrow-callback": "error",
      "prefer-destructuring": "error",
      "prefer-rest-params": "error",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
