import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build also works under a GitHub Pages sub-path.
  base: "./",
  server: {
    // In development the API is same-origin through this proxy: no CORS setup needed.
    proxy: {
      "/v1": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
  },
});
