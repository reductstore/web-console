import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "/ui",
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
    "process.env.PUBLIC_URL": JSON.stringify("/ui"),
    "process.env.REACT_APP_VERSION": JSON.stringify(
      process.env.VITE_APP_VERSION || "",
    ),
    "process.env.REACT_APP_STORAGE_URL": JSON.stringify(
      process.env.VITE_STORAGE_URL || undefined,
    ),
    global: "globalThis",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://orion.reductsoft.eu",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost",
      },
    },
    setupFiles: ["./src/setupTests.ts"],
    css: false,
  },
  build: {
    outDir: "build",
  },
}));
