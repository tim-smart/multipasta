import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["./test/**/*.test.ts"],
    browser: {
      name: "chromium",
      provider: "playwright",
      headless: true,
    },
  },
})
