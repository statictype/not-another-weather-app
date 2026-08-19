import { fileURLToPath, URL } from "node:url";
import { defineWorkersProject } from "@cloudflare/vitest-pool-workers/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      // Frontend project — React components, hooks, API client.
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "frontend",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/worker/**", "src/worker.test.ts", "src/**/*.browser.test.tsx"],
        },
      },
      // Browser project — real layout. Assertions are on numbers from
      // getBoundingClientRect() and computed styles; there are no screenshots
      // and no baseline images.
      {
        plugins: [react(), tailwindcss()],
        resolve: { alias },
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.tsx"],
          setupFiles: ["./src/test/setup.browser.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
        },
      },
      // Worker project — runs in workerd via @cloudflare/vitest-pool-workers.
      defineWorkersProject({
        resolve: { alias },
        test: {
          name: "worker",
          include: ["src/worker.test.ts", "src/worker/**/*.test.ts"],
          poolOptions: {
            workers: {
              wrangler: { configPath: "./wrangler.test.jsonc" },
            },
          },
        },
      }),
    ],
  },
});
