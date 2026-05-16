import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    alias: {
      obsidian: "obsidian-test-mocks/obsidian"
    },
    setupFiles: ["obsidian-test-mocks/setup", "tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**/*.ts", "src/services/**/*.ts", "src/types.ts"]
    }
  }
});
