import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: "postgresql://askroie:askroie123@localhost:5432/fashion_store_test",
    },
    exclude: ["e2e/**", "node_modules/**"],
    // serial execution to avoid cross-test DB races
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
