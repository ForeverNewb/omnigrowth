import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // edge-runtime matches the Convex runtime closely enough that convex-test's
    // mocks behave the same as production. Confirmed by Convex docs at
    // /docs/testing/convex-test (fetched via Context7, 2026-05-04).
    environment: "edge-runtime",
  },
});
