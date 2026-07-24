import { defineConfig } from "vitest/config";

// Basic unit-test setup. Tests run in a plain Node environment (the current
// suite covers pure helpers — no DOM needed). Coverage is emitted as lcov for
// SonarQube (see sonar-project.properties -> sonar.javascript.lcov.reportPaths).
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
